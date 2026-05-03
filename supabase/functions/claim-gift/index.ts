// Recipient claims a pending gift delivery by selecting one of their characters.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

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

    const { delivery_id, character_id } = await req.json();
    if (!delivery_id || !character_id) return json({ error: "Missing fields" }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Load profile (for discord_id)
    const { data: profile } = await admin
      .from("profiles").select("discord_id").eq("user_id", userId).maybeSingle();
    if (!profile?.discord_id) return json({ error: "Discord not linked" }, 400);

    // Load character & verify ownership
    const { data: ch } = await admin
      .from("characters").select("id, identifier, discord_id, first_name, last_name")
      .eq("id", character_id).maybeSingle();
    if (!ch) return json({ error: "Character not found" }, 404);
    if (ch.discord_id !== profile.discord_id) return json({ error: "Not your character" }, 403);

    // Load gift delivery
    const { data: delivery } = await admin
      .from("pending_deliveries")
      .select("id, recipient_user_id, is_gift, status, character_id, type, label, metadata")
      .eq("id", delivery_id).maybeSingle();
    if (!delivery) return json({ error: "Delivery not found" }, 404);
    if (!delivery.is_gift) return json({ error: "Not a gift" }, 400);
    if (delivery.recipient_user_id !== userId) return json({ error: "Not your gift" }, 403);
    if (delivery.character_id) return json({ error: "Already claimed" }, 409);
    if (delivery.status !== "pending") return json({ error: "Delivery not pending" }, 400);

    // Patch metadata so the FiveM resource gets the right owner identifier
    const meta = (delivery.metadata as Record<string, unknown> | null) ?? {};
    const ownedVehicle = (meta.owned_vehicle as Record<string, unknown> | undefined) ?? {};
    const updatedMeta = {
      ...meta,
      character_identifier: ch.identifier,
      character_name: `${ch.first_name ?? ""} ${ch.last_name ?? ""}`.trim() || null,
      owned_vehicle: { ...ownedVehicle, owner: ch.identifier },
    };

    const { error: upErr } = await admin
      .from("pending_deliveries")
      .update({
        character_id: ch.id,
        character_identifier: ch.identifier,
        claimed_at: new Date().toISOString(),
        metadata: updatedMeta,
      })
      .eq("id", delivery.id);
    if (upErr) return json({ error: "Update failed: " + upErr.message }, 500);

    return json({ success: true, label: delivery.label });
  } catch (e) {
    console.error("claim-gift error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
