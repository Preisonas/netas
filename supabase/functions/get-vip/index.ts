// FiveM endpoint: fetch current VIP status for a player.
// Auth: x-mkk-secret header (shared with sync-character / deliveries).
//
// GET /get-vip?identifier=char1:xxxx
// GET /get-vip?discord_id=123456789
// GET /get-vip                       -> returns ALL active VIPs
//
// Response (single):
// {
//   has_vip: true,
//   tier: "gold",          // "silver" | "gold" | "platinum" | null
//   expires_at: "2026-06-01T00:00:00Z",
//   expires_at_unix: 1780000000,
//   seconds_remaining: 2592000,
//   days_remaining: 30,
//   discord_id: "...",
//   identifier: "char1:..."
// }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mkk-secret",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("MKK_PANELE_SECRET");
  const provided = req.headers.get("x-mkk-secret");
  if (!expected) return json({ error: "Server not configured" }, 500);
  if (provided !== expected) return json({ error: "Unauthorized" }, 401);
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const url = new URL(req.url);
  const identifier = url.searchParams.get("identifier");
  const discordIdParam = url.searchParams.get("discord_id");

  // Resolve discord_id from identifier if needed
  let discordId = discordIdParam;
  let resolvedIdentifier = identifier;
  if (identifier && !discordId) {
    const { data: ch } = await supabase
      .from("characters")
      .select("discord_id, identifier")
      .eq("identifier", identifier)
      .maybeSingle();
    if (!ch) {
      return json({
        has_vip: false,
        tier: null,
        identifier,
        reason: "character_not_found",
      });
    }
    discordId = ch.discord_id;
    resolvedIdentifier = ch.identifier;
  }

  // Build VIP query
  let q = supabase
    .from("user_vips")
    .select("discord_id, expires_at, tier_id, vip_tiers!inner(tier, name)")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false });

  if (discordId) q = q.eq("discord_id", discordId);

  const { data, error } = await q;
  if (error) return json({ error: error.message }, 500);

  // No active VIP
  if (!data || data.length === 0) {
    if (discordId) {
      return json({
        has_vip: false,
        tier: null,
        discord_id: discordId,
        identifier: resolvedIdentifier ?? null,
      });
    }
    return json({ vips: [] });
  }

  const mapped = data.map((row: any) => {
    const tierRaw = (row.vip_tiers?.tier ?? "").toLowerCase();
    const tier =
      tierRaw === "silver" || tierRaw === "gold" || tierRaw === "platinum"
        ? tierRaw
        : null;
    const expiresAtMs = new Date(row.expires_at).getTime();
    const nowMs = Date.now();
    const secondsRemaining = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));
    return {
      has_vip: true,
      tier,
      tier_name: row.vip_tiers?.name ?? null,
      discord_id: row.discord_id,
      expires_at: row.expires_at,
      expires_at_unix: Math.floor(expiresAtMs / 1000),
      seconds_remaining: secondsRemaining,
      days_remaining: Math.ceil(secondsRemaining / 86400),
    };
  });

  // Single-player query → return the highest/longest VIP directly
  if (discordId) {
    return json({ ...mapped[0], identifier: resolvedIdentifier ?? null });
  }

  // Bulk query → return all
  return json({ vips: mapped });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
