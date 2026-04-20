import { loadStripe, Stripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

let cachedKey: string | null = null;
let stripePromise: Promise<Stripe | null> | null = null;
let envCache: "sandbox" | "live" = "sandbox";

async function fetchPublishableKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const { data, error } = await supabase.functions.invoke("stripe-public-config");
  if (error || !data?.publishableKey) {
    throw new Error("Stripe publishable key not configured");
  }
  cachedKey = data.publishableKey as string;
  envCache = cachedKey.startsWith("pk_test_") ? "sandbox" : "live";
  return cachedKey;
}

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = fetchPublishableKey().then((k) => loadStripe(k));
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
