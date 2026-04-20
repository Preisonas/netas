import { useCallback, useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (open) {
      setError(null);
      setSessionKey((k) => k + 1);
    }
  }, [open]);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-credit-checkout", {
        body: {
          credits,
          discountCode,
          returnUrl: `${window.location.origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      if (error || !data?.clientSecret) {
        const msg = (error as any)?.message || data?.error || "Nepavyko pradėti mokėjimo";
        console.error("create-credit-checkout failed:", error, data);
        setError(msg);
        toast.error(msg);
        throw new Error(msg);
      }
      return data.clientSecret as string;
    } catch (e: any) {
      const msg = e?.message || "Nepavyko pradėti mokėjimo";
      setError(msg);
      throw e;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credits, discountCode, sessionKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-2">
          <DialogTitle>Apmokėjimas — {credits} kreditų</DialogTitle>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto bg-white min-h-[500px]">
          {error ? (
            <div className="p-6 text-sm text-destructive">{error}</div>
          ) : open ? (
            <EmbeddedCheckoutProvider
              key={sessionKey}
              stripe={getStripe()}
              options={{ fetchClientSecret, onComplete: () => onSuccess?.() }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
