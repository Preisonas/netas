// Receives ESX character data from FiveM server and upserts into characters table
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mkk-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// deno-lint-ignore no-explicit-any
type AnyObj = Record<string, any>;

function pick<T = unknown>(obj: AnyObj, keys: string[], fallback?: T): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return fallback;
}

function normalize(c: AnyObj) {
  const discord_id = String(pick<string>(c, ["discord_id", "discord", "discordId"]) ?? "")
    .replace(/^discord:/, "");
  const identifier = String(pick<string>(c, ["identifier", "char_identifier", "charIdentifier", "license"]) ?? "");

  return {
    discord_id,
    identifier,
    first_name: pick<string>(c, ["first_name", "firstName", "firstname"]) ?? null,
    last_name: pick<string>(c, ["last_name", "lastName", "lastname"]) ?? null,
    job: pick<string>(c, ["job", "jobName", "job_name"]) ?? null,
    job_grade: Number(pick(c, ["job_grade", "jobGrade", "grade"]) ?? 0),
    cash: Number(pick(c, ["cash", "money_cash", "moneyCash", "money"]) ?? 0),
    bank: Number(pick(c, ["bank", "money_bank", "moneyBank"]) ?? 0),
    black_money: Number(pick(c, ["black_money", "money_black", "moneyBlack", "blackMoney"]) ?? 0),
    position: pick(c, ["position", "coords"]) ?? null,
    inventory: pick(c, ["inventory"]) ?? null,
    playtime_minutes: Number(pick(c, ["playtime_minutes", "playtimeMinutes", "playtime"]) ?? 0),
    metadata: {
      job_label: pick(c, ["job_label", "jobLabel"]) ?? null,
      job_grade_label: pick(c, ["job_grade_label", "jobGradeLabel", "grade_label", "gradeLabel"]) ?? null,
      dob: pick(c, ["dob", "date_of_birth", "dateofbirth"]) ?? null,
      sex: pick(c, ["sex", "gender"]) ?? null,
      phone_number: pick(c, ["phone_number", "phoneNumber", "phone"]) ?? null,
      personal_code: pick(c, ["personal_code", "personalCode", "ssn", "id_code"]) ?? null,
      registered_at: pick(c, ["registered_at", "registeredAt", "created_at", "firstconnection"]) ?? null,
      last_seen: pick(c, ["last_seen", "lastSeen", "last_login", "lastConnection"]) ?? null,
      online: pick(c, ["online", "is_online"]) ?? null,
      health: Number(pick(c, ["health", "hp"]) ?? 0) || null,
      armor: Number(pick(c, ["armor", "armour"]) ?? 0) || null,
      hunger: Number(pick(c, ["hunger"]) ?? 0) || null,
      thirst: Number(pick(c, ["thirst"]) ?? 0) || null,
      jail_minutes: Number(pick(c, ["jail_minutes", "jailMinutes", "jail"]) ?? 0) || null,
      driver_licenses: pick(c, ["driver_licenses", "driverLicenses"]) ?? null,
      licenses: pick(c, ["licenses"]) ?? null,
      jobs: pick(c, ["jobs", "all_jobs", "allJobs"]) ?? null,
      vehicles: pick(c, ["vehicles"]) ?? null,
      credits: pick(c, ["credits"]) ?? null,
      // VIP info from FiveM (e.g. esx_vip / custom): accepts has_vip + vip_tier ("silver" | "gold" | "platinum")
      vip: (() => {
        const tierRaw = pick<string>(c, ["vip_tier", "vipTier", "vip_type", "vipType", "vip"]);
        const has = pick<boolean | number | string>(c, ["has_vip", "hasVip", "vip_active", "vipActive", "is_vip", "isVip"]);
        const expires = pick<string>(c, ["vip_expires_at", "vipExpiresAt", "vip_expires", "vipExpires"]) ?? null;
        const tier = typeof tierRaw === "string" ? tierRaw.trim().toLowerCase() : null;
        const validTiers = ["silver", "gold", "platinum"];
        const normalizedTier = tier && validTiers.includes(tier) ? tier : null;
        const active =
          has === true || has === 1 || has === "1" || has === "true" || !!normalizedTier;
        if (!active && !normalizedTier) return null;
        return { active, tier: normalizedTier, expires_at: expires };
      })(),
      ...(c.metadata && typeof c.metadata === "object" ? c.metadata : {}),
    },
    last_synced_at: new Date().toISOString(),
  };
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

  let body: AnyObj | AnyObj[];
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const incoming = Array.isArray(body) ? body : [body];
  const rows = incoming.map(normalize);

  const invalid = rows.find((r) => !r.discord_id || !r.identifier);
  if (invalid) {
    return new Response(
      JSON.stringify({
        error: "Each character requires discord_id and identifier (or char_identifier)",
        received_keys: Object.keys(incoming[0] ?? {}),
        normalized_sample: rows[0],
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

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
