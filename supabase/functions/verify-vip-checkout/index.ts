// Verifies a VIP subscription checkout after user returns from Stripe.
// Idempotent: safe to call multiple times. Activates user_vips row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { sessionId } = await req.json();
    if (!sessionId) return json({ error: "Missing sessionId" }, 400);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" as any });

    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return json({ status: "not_paid" });
    }
    const md = session.metadata ?? {};
    if (md.gifter_user_id !== userId) return json({ error: "Not your session" }, 403);

    const subscription = session.subscription as Stripe.Subscription | null;
    if (!subscription) return json({ status: "no_subscription" });

    const tierId = md.tier_id!;
    const recipientUserId = md.recipient_user_id!;
    const isGift = md.is_gift === "1";

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: tier } = await admin
      .from("vip_tiers").select("duration_days").eq("id", tierId).maybeSingle();
    const days = tier?.duration_days ?? 30;
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : new Date(Date.now() + days * 86400000).toISOString();

    const { data: recipientProfile } = await admin
      .from("profiles").select("discord_id").eq("user_id", recipientUserId).maybeSingle();

    // Upsert by stripe_subscription_id
    const { data: existing } = await admin
      .from("user_vips").select("id").eq("stripe_subscription_id", subscription.id).maybeSingle();

    if (existing) {
      await admin.from("user_vips").update({
        expires_at: periodEnd,
        auto_renew: !subscription.cancel_at_period_end,
        cancelled_at: subscription.cancel_at_period_end ? new Date().toISOString() : null,
      }).eq("id", existing.id);
    } else {
      // Replace any other active VIPs for the recipient
      const nowIso = new Date().toISOString();
      await admin.from("user_vips").delete()
        .eq("user_id", recipientUserId).gt("expires_at", nowIso);

      await admin.from("user_vips").insert({
        user_id: recipientUserId,
        discord_id: recipientProfile?.discord_id ?? null,
        tier_id: tierId,
        expires_at: periodEnd,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
        gifter_user_id: isGift ? userId : null,
        auto_renew: !subscription.cancel_at_period_end,
      });
    }

    return json({ status: "fulfilled", expires_at: periodEnd, gifted: isGift });
  } catch (e) {
    console.error("verify-vip-checkout error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
