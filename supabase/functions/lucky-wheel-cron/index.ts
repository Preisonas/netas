// Cron-triggered: finds expired pending wheels and spins them.
// Public (no JWT) — safe because it only finalizes already-expired wheels.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const nowIso = new Date().toISOString();

  const { data: expired, error } = await admin
    .from("lucky_wheels")
    .select("id")
    .in("status", ["pending", "spinning"])
    .lte("ends_at", nowIso);

  if (error) {
    return json({ error: error.message }, 500);
  }

  const results: Array<{ id: string; outcome: string }> = [];

  for (const w of expired ?? []) {
    const { data: current } = await admin
      .from("lucky_wheels")
      .select("id, status")
      .eq("id", w.id)
      .maybeSingle();

    if (!current || (current.status !== "pending" && current.status !== "spinning")) {
      results.push({ id: w.id, outcome: "skipped" });
      continue;
    }

    if (current.status === "pending") {
      const { data: locked } = await admin
        .from("lucky_wheels")
        .update({ status: "spinning" })
        .eq("id", w.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!locked) {
        results.push({ id: w.id, outcome: "skipped" });
        continue;
      }
    }

    const { data: entries } = await admin
      .from("lucky_wheel_entries")
      .select("id, user_id, discord_id, username")
      .eq("wheel_id", w.id);

    if (!entries || entries.length === 0) {
      await admin
        .from("lucky_wheels")
        .update({ status: "cancelled", spun_at: new Date().toISOString() })
        .eq("id", w.id)
        .eq("status", "spinning");
      results.push({ id: w.id, outcome: "cancelled_no_entries" });
      continue;
    }

    const winner = entries[Math.floor(Math.random() * entries.length)];
    await admin
      .from("lucky_wheels")
      .update({
        status: "finished",
        spun_at: new Date().toISOString(),
        winner_user_id: winner.user_id,
        winner_discord_id: winner.discord_id,
        winner_username: winner.username,
        winner_entry_id: winner.id,
      })
      .eq("id", w.id)
      .eq("status", "spinning")
      .is("winner_entry_id", null);
    results.push({ id: w.id, outcome: "finished" });
  }

  return json({ success: true, processed: results.length, results });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
