// Join the active lucky wheel. VIP Gold or Platinum required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TIERS = new Set(["gold", "platinum"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  let body: { wheel_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body.wheel_id) return json({ error: "wheel_id required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Profile
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, discord_id, username, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.discord_id) return json({ error: "Discord nesusietas" }, 400);

  // Active VIP — must be Gold or Platinum
  const nowIso = new Date().toISOString();
  const { data: activeVip } = await admin
    .from("user_vips")
    .select("expires_at, vip_tiers(tier)")
    .eq("user_id", userId)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // deno-lint-ignore no-explicit-any
  const vipTier = (activeVip as any)?.vip_tiers?.tier as string | undefined;
  if (!vipTier || !ALLOWED_TIERS.has(vipTier)) {
    return json({ error: "Reikalingas Gold arba Platinum VIP" }, 403);
  }

  // Wheel must be pending, started, and not expired
  const { data: wheel } = await admin
    .from("lucky_wheels")
    .select("id, status, starts_at, ends_at")
    .eq("id", body.wheel_id)
    .maybeSingle();
  if (!wheel) return json({ error: "Ratas nerastas" }, 404);
  if (wheel.status !== "pending") return json({ error: "Ratas jau uždarytas" }, 409);
  if (new Date(wheel.ends_at).getTime() <= Date.now()) {
    return json({ error: "Laikas pasibaigė" }, 409);
  }

  const { data: entry, error: insErr } = await admin
    .from("lucky_wheel_entries")
    .insert({
      wheel_id: wheel.id,
      user_id: userId,
      discord_id: profile.discord_id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      vip_tier: vipTier,
    })
    .select()
    .single();

  if (insErr) {
    if (insErr.code === "23505") return json({ error: "Jau dalyvauji" }, 409);
    return json({ error: insErr.message }, 500);
  }

  return json({ success: true, entry });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
