// Spin the lucky wheel: pick a random entry as winner. Idempotent.
// Anyone authenticated can trigger when ends_at has passed; first call wins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // This function is idempotent and only acts on already-expired wheels.
  // It's safe to allow any caller (anon/user/service) so cron, late joiners,
  // and any viewer can converge the wheel to its finished state.
  // No auth required.
  void anonKey;

  let body: { wheel_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body.wheel_id) return json({ error: "wheel_id required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: wheel } = await admin
    .from("lucky_wheels")
    .select("id, status, ends_at, winner_entry_id")
    .eq("id", body.wheel_id)
    .maybeSingle();
  if (!wheel) return json({ error: "Ratas nerastas" }, 404);
  if (wheel.status === "finished") return json({ success: true, already: true });
  if (wheel.status === "cancelled") return json({ error: "Atšauktas" }, 409);
  if (wheel.status !== "pending" && wheel.status !== "spinning") return json({ error: "Netinkama būsena" }, 409);
  if (new Date(wheel.ends_at).getTime() > Date.now()) {
    return json({ error: "Dar nepasibaigė" }, 425);
  }

  // Atomic transition pending -> spinning. If it is already spinning, recover/finalize it.
  if (wheel.status === "pending") {
    const { data: locked, error: lockErr } = await admin
      .from("lucky_wheels")
      .update({ status: "spinning" })
      .eq("id", wheel.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (lockErr) return json({ error: lockErr.message }, 500);
    if (!locked) {
      const { data: latest } = await admin
        .from("lucky_wheels")
        .select("*")
        .eq("id", wheel.id)
        .maybeSingle();
      if (latest?.status !== "spinning") return json({ success: true, wheel: latest, already: true });
    }
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
      .eq("status", "spinning")
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
    .eq("status", "spinning")
    .is("winner_entry_id", null)
    .select()
    .maybeSingle();
  if (finErr) return json({ error: finErr.message }, 500);
  if (!finished) {
    const { data: latest } = await admin
      .from("lucky_wheels")
      .select("*")
      .eq("id", wheel.id)
      .maybeSingle();
    return json({ success: true, wheel: latest, already: true });
  }

  return json({ success: true, wheel: finished });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
