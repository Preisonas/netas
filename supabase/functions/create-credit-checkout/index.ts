import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCOUNT_CODES: Record<string, number> = {
  MKKAHUJIENAS30: 0.3,
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { credits, discountCode, returnUrl } = await req.json();

    const baseCredits = Number(credits);
    if (!Number.isFinite(baseCredits) || baseCredits < 1 || baseCredits > 10000) {
      return new Response(JSON.stringify({ error: "Invalid credit amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const credInt = Math.floor(baseCredits);

    let discount = 0;
    let codeApplied: string | null = null;
    if (discountCode && typeof discountCode === "string") {
      const normalized = discountCode.trim().toUpperCase();
      if (DISCOUNT_CODES[normalized] !== undefined) {
        discount = DISCOUNT_CODES[normalized];
        codeApplied = normalized;
      }
    }

    const cents = Math.max(50, Math.round(credInt * 100 * (1 - discount)));

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" as any });
    const env: "sandbox" | "live" = stripeKey.startsWith("sk_test_") ? "sandbox" : "live";

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: `Speed Roleplay kreditai (${credInt} €)`,
            description: codeApplied ? `Pritaikytas kodas: ${codeApplied}` : undefined,
          },
          unit_amount: cents,
        },
        quantity: 1,
      }],
      mode: "payment",
      ui_mode: "embedded",
      return_url: returnUrl || `${req.headers.get("origin")}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      customer_email: user.email ?? undefined,
      metadata: {
        userId: user.id,
        credits: String(credInt),
        discountCode: codeApplied ?? "",
      },
    });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("credit_purchases").insert({
      user_id: user.id,
      stripe_session_id: session.id,
      amount_eur: Math.round(cents / 100),
      credits: credInt,
      discount_code: codeApplied,
      status: "pending",
      environment: env,
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-credit-checkout error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
