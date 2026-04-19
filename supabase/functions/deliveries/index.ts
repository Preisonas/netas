// FiveM polling endpoint: fetch pending deliveries and mark as delivered.
// Auth: x-mkk-secret header (shared with sync-character).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mkk-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("MKK_PANELE_SECRET");
  const provided = req.headers.get("x-mkk-secret");
  if (!expected) return json({ error: "Server not configured" }, 500);
  if (provided !== expected) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // GET /deliveries?identifier=char1:xxx  -> list pending deliveries for that character
  // GET /deliveries                       -> list ALL pending deliveries
  if (req.method === "GET") {
    const identifier = url.searchParams.get("identifier");
    let q = supabase
      .from("pending_deliveries")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100);
    if (identifier) q = q.eq("character_identifier", identifier);
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);
    return json({ deliveries: data ?? [] });
  }

  // POST { id, status: "delivered" | "failed", error? }  -> mark delivery as processed
  if (req.method === "POST") {
    let body: { id?: string; status?: string; error?: string };
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (!body.id || !body.status) return json({ error: "id and status required" }, 400);
    if (!["delivered", "failed"].includes(body.status)) return json({ error: "Invalid status" }, 400);

    const { error } = await supabase
      .from("pending_deliveries")
      .update({
        status: body.status,
        delivered_at: new Date().toISOString(),
        error: body.error ?? null,
      })
      .eq("id", body.id);
    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, 405);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
