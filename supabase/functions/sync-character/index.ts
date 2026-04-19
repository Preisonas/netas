// Receives ESX character data from FiveM server and upserts into characters table
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mkk-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CharacterPayload {
  discord_id: string;
  identifier: string;
  first_name?: string;
  last_name?: string;
  job?: string;
  job_grade?: number;
  cash?: number;
  bank?: number;
  black_money?: number;
  position?: unknown;
  inventory?: unknown;
  metadata?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expectedSecret = Deno.env.get("MKK_PANELE_SECRET");
  const providedSecret = req.headers.get("x-mkk-secret");

  if (!expectedSecret) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: CharacterPayload | CharacterPayload[];
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const characters = Array.isArray(body) ? body : [body];

  // Validate required fields
  for (const c of characters) {
    if (!c.discord_id || !c.identifier) {
      return new Response(
        JSON.stringify({ error: "Each character requires discord_id and identifier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const rows = characters.map((c) => ({
    discord_id: String(c.discord_id).replace(/^discord:/, ""),
    identifier: c.identifier,
    first_name: c.first_name ?? null,
    last_name: c.last_name ?? null,
    job: c.job ?? null,
    job_grade: c.job_grade ?? 0,
    cash: c.cash ?? 0,
    bank: c.bank ?? 0,
    black_money: c.black_money ?? 0,
    position: c.position ?? null,
    inventory: c.inventory ?? null,
    metadata: c.metadata ?? null,
    last_synced_at: new Date().toISOString(),
  }));

  const { error } = await admin
    .from("characters")
    .upsert(rows, { onConflict: "identifier" });

  if (error) {
    console.error("Upsert failed", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, synced: rows.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
