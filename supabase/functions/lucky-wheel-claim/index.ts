// Winner claims the prize vehicle to a chosen character.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  let body: { wheel_id?: string; character_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body.wheel_id || !body.character_id) return json({ error: "Missing fields" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: profile } = await admin
    .from("profiles")
    .select("discord_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.discord_id) return json({ error: "Discord nesusietas" }, 400);

  const { data: wheel } = await admin
    .from("lucky_wheels")
    .select("id, status, winner_user_id, vehicle_id, delivery_id, winner_character_id")
    .eq("id", body.wheel_id)
    .maybeSingle();
  if (!wheel) return json({ error: "Ratas nerastas" }, 404);
  if (wheel.status !== "finished") return json({ error: "Dar nepasibaigė" }, 409);
  if (wheel.winner_user_id !== userId) return json({ error: "Tu nelaimėjai" }, 403);
  if (wheel.delivery_id) return json({ error: "Jau atsiimta" }, 409);

  const { data: character } = await admin
    .from("characters")
    .select("id, identifier, discord_id, first_name, last_name")
    .eq("id", body.character_id)
    .maybeSingle();
  if (!character) return json({ error: "Personažas nerastas" }, 404);
  if (character.discord_id !== profile.discord_id) return json({ error: "Ne tavo personažas" }, 403);

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("brand, model, model_name")
    .eq("id", wheel.vehicle_id)
    .maybeSingle();
  if (!vehicle) return json({ error: "Auto nerastas" }, 404);

  const spawnName = vehicle.model_name || vehicle.model;
  const displayName = vehicle.model;
  const plate = generatePlate();

  const metadata = {
    schema: "garage_vehicle_v1",
    source: "lucky_wheel",
    wheel_id: wheel.id,
    character_identifier: character.identifier,
    character_name: `${character.first_name ?? ""} ${character.last_name ?? ""}`.trim() || null,
    brand: vehicle.brand,
    model: spawnName,
    model_name: displayName,
    custom_plate: false,
    full_tune: false,
    vehicle_props: { model: spawnName, plate },
    owned_vehicle: {
      owner: character.identifier,
      plate,
      vehicle: { model: spawnName, plate },
      type: "car",
      stored: 1,
      state: 1,
      garage: null,
      job: null,
      pound: null,
    },
  };

  const { data: delivery, error: delErr } = await admin
    .from("pending_deliveries")
    .insert({
      user_id: userId,
      discord_id: profile.discord_id,
      character_id: character.id,
      character_identifier: character.identifier,
      type: "vehicle",
      item_name: spawnName,
      label: `🎰 ${vehicle.brand} ${displayName} (Sėkmės Ratas)`,
      plate,
      metadata,
    })
    .select()
    .single();
  if (delErr) return json({ error: "Pristatymo klaida: " + delErr.message }, 500);

  await admin
    .from("lucky_wheels")
    .update({ delivery_id: delivery.id, winner_character_id: character.id })
    .eq("id", wheel.id);

  return json({ success: true, delivery });
});

function generatePlate(): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const a = letters[Math.floor(Math.random() * letters.length)];
  const b = letters[Math.floor(Math.random() * letters.length)];
  const c = letters[Math.floor(Math.random() * letters.length)];
  const n = String(Math.floor(100 + Math.random() * 900));
  return `${a}${b}${c} ${n}`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
