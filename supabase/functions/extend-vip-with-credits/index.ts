// Extend an active VIP subscription by N days using the user's credits.
// Cost: ceil(price_eur / duration_days) credits per day, where 1 credit = 1 EUR.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    if (!claims?.claims?.sub) return json({ error: "Neprisijungęs" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const vipId = String(body?.vip_id ?? "");
    const days = Number(body?.days ?? 0);
    if (!vipId || !Number.isFinite(days) || days < 1 || days > 365) {
      return json({ error: "Neteisingi parametrai (vip_id ir days 1-365)" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Load VIP record (must be the user's own)
    const { data: vip, error: vipErr } = await admin
      .from("user_vips")
      .select("id, user_id, tier_id, expires_at")
      .eq("id", vipId)
      .maybeSingle();
    if (vipErr || !vip) return json({ error: "VIP nerastas" }, 404);
    if (vip.user_id !== userId) return json({ error: "Ne tavo VIP" }, 403);

    // Load tier price
    const { data: tier } = await admin
      .from("vip_tiers")
      .select("id, name, price, eur_price, duration_days")
      .eq("id", vip.tier_id)
      .maybeSingle();
    if (!tier) return json({ error: "VIP lygis nerastas" }, 404);

    const eurPrice = Number(tier.eur_price) || Number(tier.price) || 0;
    const durationDays = Number(tier.duration_days) || 30;
    if (eurPrice <= 0 || durationDays <= 0) {
      return json({ error: "Klaidinga VIP lygio kaina" }, 500);
    }
    const perDayEur = eurPrice / durationDays;
    const totalCost = Math.ceil(perDayEur * days);

    // Load profile credits
    const { data: profile } = await admin
      .from("profiles")
      .select("credits")
      .eq("user_id", userId)
      .maybeSingle();
    const creditsHave = profile?.credits ?? 0;
    if (creditsHave < totalCost) {
      return json({
        error: `Trūksta kreditų. Reikia ${totalCost}, turi ${creditsHave}.`,
      }, 400);
    }

    // Compute new expiry: from later of now or current expiry
    const now = Date.now();
    const currentExp = new Date(vip.expires_at).getTime();
    const baseMs = Math.max(now, currentExp);
    const newExpiry = new Date(baseMs + days * 86_400_000).toISOString();

    // Charge credits
    const { error: payErr } = await admin
      .from("profiles")
      .update({ credits: creditsHave - totalCost })
      .eq("user_id", userId);
    if (payErr) return json({ error: "Nepavyko nuskaityti kreditų: " + payErr.message }, 500);

    // Extend VIP
    const { error: updErr } = await admin
      .from("user_vips")
      .update({ expires_at: newExpiry })
      .eq("id", vipId);
    if (updErr) {
      // Refund on failure
      await admin.from("profiles").update({ credits: creditsHave }).eq("user_id", userId);
      return json({ error: "Nepavyko pratęsti VIP: " + updErr.message }, 500);
    }

    return json({
      success: true,
      vip_id: vipId,
      days_added: days,
      cost_credits: totalCost,
      credits_remaining: creditsHave - totalCost,
      new_expires_at: newExpiry,
      tier_name: tier.name,
    });
  } catch (e) {
    return json({ error: (e as Error).message || "Serverio klaida" }, 500);
  }
});
