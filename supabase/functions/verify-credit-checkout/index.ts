import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" as any });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === "paid";
    const sessionUserId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits ?? "0", 10);

    if (!paid || sessionUserId !== user.id || !credits) {
      return new Response(JSON.stringify({ status: "not_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: purchase } = await admin
      .from("credit_purchases")
      .select("id, status")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (!purchase) {
      return new Response(JSON.stringify({ error: "Purchase not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (purchase.status === "fulfilled") {
      const { data: profile } = await admin
        .from("profiles").select("credits").eq("user_id", user.id).maybeSingle();
      return new Response(JSON.stringify({ status: "already", credits: profile?.credits ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin
      .from("profiles").select("credits").eq("user_id", user.id).maybeSingle();
    const newBalance = (profile?.credits ?? 0) + credits;
    await admin.from("profiles").update({ credits: newBalance }).eq("user_id", user.id);
    await admin.from("credit_purchases")
      .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
      .eq("id", purchase.id);

    const codeUsed = session.metadata?.discountCode;
    if (codeUsed) {
      const { data: dc } = await admin
        .from("discount_codes").select("id, uses").eq("code", codeUsed).maybeSingle();
      if (dc) {
        await admin.from("discount_codes")
          .update({ uses: (dc.uses ?? 0) + 1 }).eq("id", dc.id);
      }
    }

    return new Response(JSON.stringify({ status: "fulfilled", credits: newBalance, added: credits }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-credit-checkout error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
