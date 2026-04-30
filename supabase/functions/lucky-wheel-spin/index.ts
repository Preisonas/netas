// Spin the lucky wheel: pick a random entry as winner. Idempotent.
// Anyone authenticated can trigger when ends_at has passed; first call wins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Allow either: an authenticated user OR the service role key (for cron)
  const authHeader = req.headers.get("Authorization") ?? "";
  const apiKey = req.headers.get("apikey") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const isServiceCall = token === serviceKey || apiKey === serviceKey;

  if (!isServiceCall) {
    if (!token) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  }

  let body: { wheel_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body.wheel_id) return json({ error: "wheel_id required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: wheel } = await admin
    .from("lucky_wheels")
    .select("id, status, ends_at")
    .eq("id", body.wheel_id)
    .maybeSingle();
  if (!wheel) return json({ error: "Ratas nerastas" }, 404);
  if (wheel.status === "finished") return json({ success: true, already: true });
  if (wheel.status === "cancelled") return json({ error: "Atšauktas" }, 409);
  if (new Date(wheel.ends_at).getTime() > Date.now()) {
    return json({ error: "Dar nepasibaigė" }, 425);
  }

  // Atomic transition pending -> spinning to lock the wheel for one spinner
  const { data: locked, error: lockErr } = await admin
    .from("lucky_wheels")
    .update({ status: "spinning" })
    .eq("id", wheel.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (lockErr) return json({ error: lockErr.message }, 500);

  if (!locked) {
    // Someone else is spinning or already finished — return current state
    const { data: latest } = await admin
      .from("lucky_wheels")
      .select("*")
      .eq("id", wheel.id)
      .maybeSingle();
    return json({ success: true, wheel: latest, already: true });
  }

  const { data: entries } = await admin
    .from("lucky_wheel_entries")
    .select("id, user_id, discord_id, username")
    .eq("wheel_id", wheel.id);

  if (!entries || entries.length === 0) {
    // Cancel — no participants
    const { data: updated } = await admin
      .from("lucky_wheels")
      .update({ status: "cancelled", spun_at: new Date().toISOString() })
      .eq("id", wheel.id)
      .select()
      .single();
    return json({ success: true, wheel: updated, no_entries: true });
  }

  const winner = entries[Math.floor(Math.random() * entries.length)];

  const { data: finished, error: finErr } = await admin
    .from("lucky_wheels")
    .update({
      status: "finished",
      spun_at: new Date().toISOString(),
      winner_user_id: winner.user_id,
      winner_discord_id: winner.discord_id,
      winner_username: winner.username,
      winner_entry_id: winner.id,
    })
    .eq("id", wheel.id)
    .select()
    .single();
  if (finErr) return json({ error: finErr.message }, 500);

  return json({ success: true, wheel: finished });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
