// Cancels a VIP Stripe subscription at period end.
// User keeps VIP until expires_at, then auto_renew = false.
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

    const { user_vip_id } = await req.json();
    if (!user_vip_id) return json({ error: "user_vip_id required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: vip } = await admin
      .from("user_vips")
      .select("id, user_id, gifter_user_id, stripe_subscription_id")
      .eq("id", user_vip_id).maybeSingle();
    if (!vip) return json({ error: "Not found" }, 404);

    // Only the payer (user themselves OR the gifter who pays) can cancel
    const payer = vip.gifter_user_id ?? vip.user_id;
    if (payer !== userId) return json({ error: "Forbidden" }, 403);
    if (!vip.stripe_subscription_id) return json({ error: "No active subscription" }, 400);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" as any });

    await stripe.subscriptions.update(vip.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await admin.from("user_vips").update({
      auto_renew: false,
      cancelled_at: new Date().toISOString(),
    }).eq("id", vip.id);

    return json({ status: "cancelled_at_period_end" });
  } catch (e) {
    console.error("cancel-vip-subscription error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
