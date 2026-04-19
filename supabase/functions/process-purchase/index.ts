// Server-authoritative purchase: validates price from DB, deducts credits, creates delivery row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  type: "vehicle" | "case_item";
  // For vehicle: vehicle_id (uuid). For case_item: case_id (uuid) — server picks reward.
  vehicle_id?: string;
  case_id?: string;
  character_id: string; // uuid of selected character
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Resolve user from JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
  const user = userData.user;

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body.type || !body.character_id) return json({ error: "Missing fields" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Profile + character ownership
  const { data: profile, error: profErr } = await admin
    .from("profiles").select("credits, discord_id").eq("user_id", user.id).maybeSingle();
  if (profErr || !profile) return json({ error: "Profile not found" }, 404);
  if (!profile.discord_id) return json({ error: "Discord not linked" }, 400);

  const { data: character, error: charErr } = await admin
    .from("characters").select("id, identifier, discord_id, first_name, last_name")
    .eq("id", body.character_id).maybeSingle();
  if (charErr || !character) return json({ error: "Character not found" }, 404);
  if (character.discord_id !== profile.discord_id) return json({ error: "Not your character" }, 403);

  // Compute price + reward server-side
  let price = 0;
  let itemName = "";
  let label = "";
  let plate: string | null = null;
  let deliveryMetadata: Record<string, unknown> | null = null;

  if (body.type === "vehicle") {
    if (!body.vehicle_id) return json({ error: "vehicle_id required" }, 400);
    const { data: v, error } = await admin
      .from("vehicles").select("price, model, model_name, brand").eq("id", body.vehicle_id).maybeSingle();
    if (error || !v) return json({ error: "Vehicle not found" }, 404);
    price = v.price;
    itemName = v.model;
    label = `${v.brand} ${v.model_name || v.model}`;
    plate = generatePlate();
    deliveryMetadata = buildVehicleDeliveryMetadata({
      characterIdentifier: character.identifier,
      characterName: `${character.first_name ?? ""} ${character.last_name ?? ""}`.trim() || null,
      brand: v.brand,
      model: v.model,
      modelName: v.model_name || v.model,
      plate,
    });
  } else if (body.type === "case_item") {
    if (!body.case_id) return json({ error: "case_id required" }, 400);
    const { data: c, error: cErr } = await admin
      .from("cases").select("price, name").eq("id", body.case_id).maybeSingle();
    if (cErr || !c) return json({ error: "Case not found" }, 404);
    price = c.price;
    const { data: items, error: iErr } = await admin
      .from("case_items").select("item_name, label, chance").eq("case_id", body.case_id);
    if (iErr || !items || items.length === 0) return json({ error: "Case has no items" }, 400);
    const picked = pickWeighted(items);
    itemName = picked.item_name;
    label = `${c.name} → ${picked.label}`;
  } else {
    return json({ error: "Invalid type" }, 400);
  }

  if (profile.credits < price) {
    return json({ error: "Insufficient credits", credits: profile.credits, price }, 402);
  }

  // Deduct credits with optimistic check
  const { error: updErr, data: updData } = await admin
    .from("profiles")
    .update({ credits: profile.credits - price })
    .eq("user_id", user.id)
    .eq("credits", profile.credits) // optimistic concurrency
    .select("credits")
    .maybeSingle();
  if (updErr || !updData) return json({ error: "Credit deduction failed, retry" }, 409);

  // Create delivery row
  const { data: delivery, error: delErr } = await admin
    .from("pending_deliveries").insert({
      user_id: user.id,
      discord_id: profile.discord_id,
      character_id: character.id,
      character_identifier: character.identifier,
      type: body.type,
      item_name: itemName,
      label,
      plate,
      metadata: deliveryMetadata,
    }).select().single();
  if (delErr) {
    // refund
    await admin.from("profiles").update({ credits: profile.credits }).eq("user_id", user.id);
    return json({ error: "Delivery creation failed: " + delErr.message }, 500);
  }

  return json({
    success: true,
    delivery,
    label,
    plate,
    price,
    credits_remaining: updData.credits,
    character: { first_name: character.first_name, last_name: character.last_name },
  });
});

function pickWeighted<T extends { chance: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + (i.chance || 0), 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (const it of items) { r -= (it.chance || 0); if (r <= 0) return it; }
  return items[items.length - 1];
}

function buildVehicleDeliveryMetadata({
  characterIdentifier,
  characterName,
  brand,
  model,
  modelName,
  plate,
}: {
  characterIdentifier: string;
  characterName: string | null;
  brand: string;
  model: string;
  modelName: string;
  plate: string;
}) {
  const modelHash = joaat(model);
  const vehicleProps = {
    model: modelHash,
    plate,
  };

  return {
    schema: "garage_vehicle_v1",
    source: "panel_shop",
    character_identifier: characterIdentifier,
    character_name: characterName,
    brand,
    model,
    model_name: modelName,
    model_hash: modelHash,
    vehicle_props: vehicleProps,
    owned_vehicle: {
      owner: characterIdentifier,
      plate,
      vehicle: vehicleProps,
      type: "car",
      stored: 1,
      state: 1,
      garage: null,
      job: null,
      pound: null,
    },
  };
}

function generatePlate(): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const a = letters[Math.floor(Math.random() * letters.length)];
  const b = letters[Math.floor(Math.random() * letters.length)];
  const c = letters[Math.floor(Math.random() * letters.length)];
  const n = String(Math.floor(100 + Math.random() * 900));
  return `${a}${b}${c} ${n}`;
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
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
