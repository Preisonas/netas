import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("Stripe event", event.type, "env:", env);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const sessionId: string = session.id;
      const userId: string | undefined = session.metadata?.userId;
      const creditsStr: string | undefined = session.metadata?.credits;
      const credits = creditsStr ? parseInt(creditsStr, 10) : 0;

      if (!userId || !credits) {
        console.error("Missing metadata on session", sessionId);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Idempotent fulfillment: only fulfill if still pending
      const { data: purchase } = await supabase
        .from("credit_purchases")
        .select("id, status")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (!purchase) {
        console.error("No purchase row for session", sessionId);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }
      if (purchase.status === "fulfilled") {
        return new Response(JSON.stringify({ received: true, already: true }), { status: 200 });
      }

      // Add credits to profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();

      const newBalance = (profile?.credits ?? 0) + credits;
      await supabase.from("profiles").update({ credits: newBalance }).eq("user_id", userId);

      await supabase
        .from("credit_purchases")
        .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
        .eq("id", purchase.id);

      console.log(`Credited ${credits} to user ${userId}; new balance ${newBalance}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
