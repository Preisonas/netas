import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setCheckoutUrl(null);
      setLoading(false);
      return;
    }

    let active = true;
    setError(null);
    setLoading(true);
    setCheckoutUrl(null);

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

        if (error || !data?.url) {
          const msg = (error as any)?.message || data?.error || "Nepavyko pradėti mokėjimo";
          console.error("create-credit-checkout failed:", error, data);
          setError(msg);
          toast.error(msg);
          return;
        }

        const url = String(data.url);
        setCheckoutUrl(url);
        window.location.assign(url);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="px-1 pt-1">
          <DialogTitle className="text-foreground">Apmokėjimas — {credits} kreditų</DialogTitle>
          <DialogDescription>
            Tave nukreipiame į saugų Stripe apmokėjimo puslapį.
          </DialogDescription>
        </DialogHeader>
        <div className="px-1 pb-1">
          {error ? (
            <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-4 text-sm">
              <p className="text-destructive">{error}</p>
              {checkoutUrl ? (
                <button
                  onClick={() => window.location.assign(checkoutUrl)}
                  className="w-full rounded-md bg-[image:var(--gradient-brand)] px-4 py-2 font-medium text-primary-foreground"
                >
                  Atidaryti apmokėjimą
                </button>
              ) : null}
            </div>
          ) : loading ? (
            <div className="rounded-md border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
              Ruošiamas apmokėjimas...
            </div>
          ) : checkoutUrl ? (
            <button
              onClick={() => window.location.assign(checkoutUrl)}
              className="w-full rounded-md bg-[image:var(--gradient-brand)] px-4 py-2 font-medium text-primary-foreground"
            >
              Atidaryti apmokėjimą
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
