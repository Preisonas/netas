// Creates a Stripe Checkout session in subscription mode for VIP.
// Supports self-purchase and gifting (gifter pays, recipient gets VIP).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) ?? null;

    const body = await req.json();
    const tierId: string = body.vip_tier_id;
    const giftDiscordId: string | null = (body.gift_to_discord_id ?? "").trim() || null;
    const returnUrl: string | undefined = body.returnUrl;
    if (!tierId) return json({ error: "vip_tier_id required" }, 400);
    if (giftDiscordId && !/^\d{5,32}$/.test(giftDiscordId)) {
      return json({ error: "Netinkamas Discord ID" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: tier, error: tierErr } = await admin
      .from("vip_tiers")
      .select("id, tier, name, eur_price, duration_days, active")
      .eq("id", tierId).maybeSingle();
    if (tierErr || !tier) return json({ error: "VIP tier not found" }, 404);
    if (!tier.active) return json({ error: "VIP tier inactive" }, 400);
    if (!tier.eur_price || tier.eur_price <= 0) return json({ error: "VIP tier has no EUR price" }, 400);

    // Resolve recipient if gift
    let recipientUserId = userId;
    let recipientDiscordId: string | null = null;
    let recipientUsername: string | null = null;
    const isGift = !!giftDiscordId;
    if (isGift) {
      const { data: recip } = await admin
        .from("profiles").select("user_id, discord_id, username")
        .eq("discord_id", giftDiscordId).maybeSingle();
      if (!recip) return json({ error: "Vartotojas su tokiu Discord ID nerastas" }, 404);
      recipientUserId = recip.user_id;
      recipientDiscordId = recip.discord_id;
      recipientUsername = recip.username;
    } else {
      const { data: self } = await admin
        .from("profiles").select("discord_id").eq("user_id", userId).maybeSingle();
      recipientDiscordId = self?.discord_id ?? null;
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" as any });

    const origin = req.headers.get("origin") ?? "";
    const successUrl = returnUrl || `${origin}/?vip_checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/?vip_checkout=cancelled`;

    const unitAmount = Math.round(Number(tier.eur_price) * 100);
    const productName = isGift
      ? `${tier.name} (Dovana ${recipientUsername ?? recipientDiscordId})`
      : tier.name;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "eur",
          recurring: { interval: "month" },
          product_data: {
            name: productName,
            description: isGift
              ? `VIP narystė padovanota ${recipientUsername ?? recipientDiscordId}. Mokėjimas — kas mėnesį iš tavo kortelės.`
              : `VIP narystė. Mokėjimas — kas mėnesį.`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      customer_email: userEmail ?? undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          tier_id: tier.id,
          tier_code: tier.tier,
          gifter_user_id: userId,
          recipient_user_id: recipientUserId,
          recipient_discord_id: recipientDiscordId ?? "",
          is_gift: isGift ? "1" : "0",
          duration_days: String(tier.duration_days ?? 30),
        },
      },
      metadata: {
        tier_id: tier.id,
        gifter_user_id: userId,
        recipient_user_id: recipientUserId,
        is_gift: isGift ? "1" : "0",
      },
    });

    return json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error("create-vip-subscription error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
