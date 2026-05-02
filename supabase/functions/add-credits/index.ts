// FiveM endpoint: securely add credits to a player (e.g. playtime claim rewards).
// Auth: x-mkk-secret header (shared with sync-character / deliveries / get-vip).
//
// POST /add-credits
// Body:
// {
//   "identifier": "char1:xxxx",        // optional if discord_id provided
//   "discord_id": "123456789",         // optional if identifier provided
//   "credits": 5,                      // credits to add (required, 1..10000)
//   "reason": "playtime_claim",        // optional, for logging
//   "claim_key": "playtime:2026-05-02" // optional idempotency key (per user)
// }
//
// Response:
// {
//   success: true,
//   user_id: "...",
//   discord_id: "...",
//   credits_added: 5,
//   new_balance: 42,
//   reason: "playtime_claim"
// }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mkk-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("MKK_PANELE_SECRET");
  const provided = req.headers.get("x-mkk-secret");
  if (!expected) return json({ error: "Server not configured" }, 500);
  if (provided !== expected) return json({ error: "Unauthorized" }, 401);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: {
    identifier?: string;
    discord_id?: string;
    credits?: number;
    reason?: string;
    claim_key?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const baseCredits = Number(body.credits);
  if (!Number.isFinite(baseCredits) || baseCredits < 1 || baseCredits > 10000) {
    return json({ error: "credits must be 1..10000" }, 400);
  }
  const creditsToAdd = Math.floor(baseCredits);

  if (!body.identifier && !body.discord_id) {
    return json({ error: "identifier or discord_id required" }, 400);
  }

  const reason = (body.reason ?? "fivem_grant").toString().slice(0, 64);
  const claimKey = typeof body.claim_key === "string" && body.claim_key.length > 0
    ? body.claim_key.slice(0, 128)
    : null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Resolve discord_id -> profile (user_id, credits)
  let discordId = body.discord_id ?? null;
  if (!discordId && body.identifier) {
    const { data: ch, error: chErr } = await supabase
      .from("characters")
      .select("discord_id")
      .eq("identifier", body.identifier)
      .maybeSingle();
    if (chErr) return json({ error: chErr.message }, 500);
    if (!ch) return json({ error: "character_not_found" }, 404);
    discordId = ch.discord_id;
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("user_id, discord_id, credits")
    .eq("discord_id", discordId!)
    .maybeSingle();
  if (profErr) return json({ error: profErr.message }, 500);
  if (!profile) return json({ error: "profile_not_found" }, 404);

  // Idempotency check (uses credit_purchases.stripe_session_id as a unique-ish key)
  if (claimKey) {
    const dedupeId = `fivem:${profile.user_id}:${claimKey}`;
    const { data: existing } = await supabase
      .from("credit_purchases")
      .select("id, credits")
      .eq("stripe_session_id", dedupeId)
      .maybeSingle();
    if (existing) {
      return json({
        success: true,
        already_claimed: true,
        user_id: profile.user_id,
        discord_id: profile.discord_id,
        new_balance: profile.credits,
        reason,
      });
    }
  }

  const newBalance = (profile.credits ?? 0) + creditsToAdd;

  // Update credits
  const { error: updErr } = await supabase
    .from("profiles")
    .update({ credits: newBalance })
    .eq("user_id", profile.user_id);
  if (updErr) return json({ error: updErr.message }, 500);

  // Audit log via credit_purchases (status=fulfilled, environment=fivem)
  const dedupeId = claimKey
    ? `fivem:${profile.user_id}:${claimKey}`
    : `fivem:${profile.user_id}:${reason}:${Date.now()}`;
  await supabase.from("credit_purchases").insert({
    user_id: profile.user_id,
    stripe_session_id: dedupeId,
    amount_eur: 0,
    credits: creditsToAdd,
    discount_code: null,
    status: "fulfilled",
    environment: "fivem",
    fulfilled_at: new Date().toISOString(),
  });

  return json({
    success: true,
    user_id: profile.user_id,
    discord_id: profile.discord_id,
    credits_added: creditsToAdd,
    new_balance: newBalance,
    reason,
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
