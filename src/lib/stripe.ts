import { loadStripe, Stripe } from "@stripe/stripe-js";

const clientToken = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
export const stripeEnvironment: "sandbox" | "live" =
  clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) {
      throw new Error("VITE_STRIPE_PUBLISHABLE_KEY is not set");
    }
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}
