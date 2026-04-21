import { useEffect, useState } from "react";
import { getCachedStripeEnvironment, getStripeEnvironment } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  const [env, setEnv] = useState(getCachedStripeEnvironment());

  useEffect(() => {
    getStripeEnvironment().then((nextEnv) => setEnv(nextEnv)).catch(() => {});
  }, []);

  if (env !== "sandbox") return null;
  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-xs text-orange-800">
      Bandomasis režimas. Naudok testinę kortelę 4242 4242 4242 4242.
    </div>
  );
}
