import { loadStripe, Stripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

let cachedKey: string | null = null;
let stripePromise: Promise<Stripe | null> | null = null;
let envCache: "sandbox" | "live" = "sandbox";

async function fetchPublishableKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  const { data, error } = await supabase.functions.invoke("stripe-public-config");
  const key = typeof data?.publishableKey === "string" ? data.publishableKey.trim() : "";

  if (error || !key) {
    throw new Error("Stripe publishable key not configured");
  }

  if (!key.startsWith("pk_")) {
    throw new Error("Invalid Stripe publishable key configuration");
  }

  cachedKey = key;
  envCache = key.startsWith("pk_test_") ? "sandbox" : "live";
  return cachedKey;
}

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = fetchPublishableKey()
      .then((key) => loadStripe(key))
      .catch((err) => {
        stripePromise = null;
        throw err;
      });
  }

  return stripePromise;
}

export async function getStripeEnvironment(): Promise<"sandbox" | "live"> {
  await fetchPublishableKey();
  return envCache;
}

export function getCachedStripeEnvironment(): "sandbox" | "live" {
  return envCache;
}

// Backwards-compat export — value resolves after first getStripe() call
export const stripeEnvironment: "sandbox" | "live" = envCache;
