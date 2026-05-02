// FiveM polling endpoint: fetch pending deliveries and mark as delivered.
// Auth: x-mkk-secret header (shared with sync-character).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mkk-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type DeliveryRow = {
  id: string;
  user_id: string;
  discord_id: string;
  character_id: string;
  character_identifier: string;
  type: string;
  item_name: string;
  label: string;
  plate: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  created_at: string;
  delivered_at: string | null;
  error: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("MKK_PANELE_SECRET");
  const provided = req.headers.get("x-mkk-secret");
  if (!expected) return json({ error: "Server not configured" }, 500);
  if (provided !== expected) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

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
    return json({ deliveries: (data ?? []).map((delivery) => enrichDelivery(delivery as DeliveryRow)) });
  }

  // POST { id, status: "delivered" | "failed", error? }  -> mark delivery as processed
  if (req.method === "POST") {
    let body: { id?: string; status?: string; error?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (!body.id || !body.status) return json({ error: "id and status required" }, 400);
    if (!["delivered", "failed"].includes(body.status)) return json({ error: "Invalid status" }, 400);

    // Fetch delivery first so we can refund on failure
    const { data: delivery, error: fetchErr } = await supabase
      .from("pending_deliveries")
      .select("id, user_id, status, type, item_name, label")
      .eq("id", body.id)
      .maybeSingle();
    if (fetchErr || !delivery) return json({ error: "Delivery not found" }, 404);
    if (delivery.status !== "pending") {
      return json({ success: true, note: "Already processed" });
    }

    const { error } = await supabase
      .from("pending_deliveries")
      .update({
        status: body.status,
        delivered_at: new Date().toISOString(),
        error: body.error ?? null,
      })
      .eq("id", body.id)
      .eq("status", "pending");
    if (error) return json({ error: error.message }, 500);

    // Never auto-refund here.
    // If FiveM reports a failure after spawning or during a transient issue,
    // refunding here creates duplicate value for the player.

    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, 405);
});

function enrichDelivery(delivery: DeliveryRow) {
  if (delivery.type === "vip") return enrichVipDelivery(delivery);
  if (delivery.type !== "vehicle") return delivery;

  const metadata = isRecord(delivery.metadata) ? delivery.metadata : {};
  const ownedVehicle = isRecord(metadata.owned_vehicle) ? metadata.owned_vehicle : {};
  const vehicleProps = isRecord(metadata.vehicle_props) ? metadata.vehicle_props : {};
  const plate = delivery.plate ?? stringify(metadata.plate) ?? stringify(ownedVehicle.plate) ?? null;
  const model = stringify(metadata.model) ?? delivery.item_name;
  const modelHash = toInt(metadata.model_hash) ?? joaat(model);

  // Keep the full vehicle props payload so FiveM can insert it directly into owned_vehicles
  // and/or apply upgrades from the same object. Only normalize model/plate fields.
  const normalizedVehicleProps = {
    ...vehicleProps,
    model,
    plate: stringify(vehicleProps.plate) ?? plate,
  };

  const normalizedOwnedVehicle = {
    ...ownedVehicle,
    owner: stringify(ownedVehicle.owner) ?? delivery.character_identifier,
    plate,
    vehicle: normalizedVehicleProps,
    type: stringify(ownedVehicle.type) ?? "car",
    stored: toInt(ownedVehicle.stored) ?? 1,
    state: toInt(ownedVehicle.state) ?? 1,
    garage: stringify(ownedVehicle.garage),
    job: stringify(ownedVehicle.job),
    pound: stringify(ownedVehicle.pound),
  };

  return {
    ...delivery,
    metadata,
    garage_payload: {
      schema: "garage_vehicle_v1",
      owner: normalizedOwnedVehicle.owner,
      plate,
      model,
      model_hash: modelHash,
      vehicle: normalizedVehicleProps,
      owned_vehicle: normalizedOwnedVehicle,
      type: normalizedOwnedVehicle.type,
      stored: normalizedOwnedVehicle.stored,
      state: normalizedOwnedVehicle.state,
      garage: normalizedOwnedVehicle.garage,
      job: normalizedOwnedVehicle.job,
      pound: normalizedOwnedVehicle.pound,
    },
  };
}

function enrichVipDelivery(delivery: DeliveryRow) {
  const metadata = isRecord(delivery.metadata) ? delivery.metadata : {};
  const tier = (stringify(metadata.tier) ?? stringify(metadata.vip_tier) ?? delivery.item_name ?? "").toLowerCase();
  const durationDays = toInt(metadata.duration_days) ?? 30;
  const now = Date.now();
  const expiresAtMs = toInt(metadata.expires_at_ms) ?? (now + durationDays * 24 * 60 * 60 * 1000);
  const expiresAtIso = stringify(metadata.expires_at) ?? new Date(expiresAtMs).toISOString();

  return {
    ...delivery,
    metadata,
    vip_payload: {
      schema: "vip_grant_v1",
      discord_id: delivery.discord_id,
      identifier: delivery.character_identifier,
      tier, // "silver" | "gold" | "platinum"
      duration_days: durationDays,
      duration_seconds: durationDays * 24 * 60 * 60,
      granted_at: new Date(now).toISOString(),
      expires_at: expiresAtIso,
      expires_at_unix: Math.floor(expiresAtMs / 1000),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringify(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function joaat(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash += value.charCodeAt(i);
    hash += hash << 10;
    hash ^= hash >>> 6;
  }
  hash += hash << 3;
  hash ^= hash >>> 11;
  hash += hash << 15;
  return hash | 0;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
