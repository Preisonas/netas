import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreditCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credits: number;
  discountCode?: string;
  onSuccess?: () => void;
}

export function CreditCheckoutDialog({
  open,
  onOpenChange,
  credits,
  discountCode,
  onSuccess,
}: CreditCheckoutDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const stripePromise = useMemo(() => getStripe(), []);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setClientSecret(null);
      setLoading(false);
      return;
    }

    let active = true;
    setError(null);
    setLoading(true);
    setClientSecret(null);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-credit-checkout", {
          body: {
            credits,
            discountCode,
            returnUrl: `${window.location.origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          },
        });

        if (!active) return;

        if (error || !data?.clientSecret) {
          const msg = (error as any)?.message || data?.error || "Nepavyko pradėti mokėjimo";
          console.error("create-credit-checkout failed:", error, data);
          setError(msg);
          toast.error(msg);
          return;
        }

        setClientSecret(data.clientSecret as string);
      } catch (e: any) {
        if (!active) return;
        const msg = e?.message || "Nepavyko pradėti mokėjimo";
        console.error("create-credit-checkout threw:", e);
        setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, credits, discountCode]);

  const handleComplete = useCallback(() => {
    onSuccessRef.current?.();
  }, []);

  const checkoutOptions = useMemo(
    () => (clientSecret ? { clientSecret, onComplete: handleComplete } : null),
    [clientSecret, handleComplete],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden border-0 bg-card max-w-3xl w-screen h-[100dvh] sm:w-[95vw] sm:h-auto sm:max-h-[90vh] sm:rounded-lg flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 bg-card border-0 shrink-0">
          <DialogTitle className="text-foreground">Apmokėjimas — {credits} kreditų</DialogTitle>
          <DialogDescription className="sr-only">Stripe apmokėjimo langas kreditų pirkimui.</DialogDescription>
        </DialogHeader>
        <div className="checkout-scroll flex-1 overflow-y-auto overflow-x-hidden bg-white -webkit-overflow-scrolling-touch">
          {error ? (
            <div className="p-6 text-sm text-destructive">{error}</div>
          ) : loading ? (
            <div className="p-6 text-sm text-muted-foreground">Kraunamas apmokėjimas...</div>
          ) : open && checkoutOptions ? (
            <div className="min-h-full w-full">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={checkoutOptions}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
