import { useEffect, useState } from "react";
import { getCachedStripeEnvironment, getStripeEnvironment } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  const [env, setEnv] = useState(getCachedStripeEnvironment());

  useEffect(() => {
    getStripeEnvironment().then((nextEnv) => setEnv(nextEnv)).catch(() => {});
  }, []);

  if (env !== "sandbox") return null;
  return (
    <div className="w-full border-b border-border bg-secondary px-4 py-2 text-center text-xs text-foreground">
      Bandomasis režimas. Naudok testinę kortelę 4242 4242 4242 4242.
    </div>
  );
}
