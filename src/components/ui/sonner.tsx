import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      offset={20}
      gap={10}
      visibleToasts={3}
      closeButton
      icons={{
        success: <Check className="h-4 w-4 text-primary" strokeWidth={3} />,
        error: <X className="h-4 w-4 text-destructive" strokeWidth={3} />,
        warning: <AlertTriangle className="h-4 w-4 text-[hsl(38_95%_60%)]" strokeWidth={2.5} />,
        info: <Info className="h-4 w-4 text-[hsl(210_80%_65%)]" strokeWidth={2.5} />,
        loading: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={2.5} />,
      }}
      toastOptions={{
        duration: 3500,
        classNames: {
          toast:
            "group !w-[340px] !bg-card/95 !border !border-border/60 !text-foreground !backdrop-blur-xl !shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] !rounded-lg !p-3 !pl-3.5 !pr-3 !gap-2.5 !items-center",
          title: "!text-[13px] !font-semibold !leading-tight !text-foreground",
          description: "!text-[12px] !text-muted-foreground !mt-0.5 !leading-snug",
          icon: "!shrink-0 !m-0 !self-center",
          closeButton:
            "!opacity-0 group-hover:!opacity-100 !transition-opacity !left-auto !right-2 !top-1/2 !-translate-y-1/2 !translate-x-0 !h-6 !w-6 !rounded-md !bg-secondary/80 hover:!bg-secondary !border-0 !text-muted-foreground hover:!text-foreground !grid !place-items-center [&>svg]:!h-3.5 [&>svg]:!w-3.5",
          actionButton:
            "!bg-[image:var(--gradient-brand)] !text-primary-foreground !text-[11px] !font-semibold !h-7 !px-2.5 !rounded-md hover:!opacity-90 !transition",
          cancelButton:
            "!bg-secondary !text-foreground !text-[11px] !font-semibold !h-7 !px-2.5 !rounded-md hover:!bg-secondary/80 !transition",
        },
      }}
      {...props}
    />
  );
};

// Wrap toast with dedup: same message within 1.5s reuses the same toast id
const recent = new Map<string, number>();
const DEDUP_MS = 1500;

const keyOf = (msg: unknown, type: string) => `${type}:${typeof msg === "string" ? msg : JSON.stringify(msg)}`;

const dedup = (type: "default" | "success" | "error" | "warning" | "info" | "loading") =>
  (message: Parameters<typeof sonnerToast>[0], data?: Parameters<typeof sonnerToast>[1]) => {
    const k = keyOf(message, type);
    const now = Date.now();
    const last = recent.get(k);
    if (last && now - last < DEDUP_MS) {
      return sonnerToast[type === "default" ? "message" : type](message as any, { ...data, id: k });
    }
    recent.set(k, now);
    // cleanup old
    if (recent.size > 50) {
      for (const [key, ts] of recent) if (now - ts > DEDUP_MS * 4) recent.delete(key);
    }
    return type === "default"
      ? sonnerToast(message as any, { ...data, id: k })
      : sonnerToast[type](message as any, { ...data, id: k });
  };

const baseToast = dedup("default") as unknown as typeof sonnerToast;
const toast = Object.assign(baseToast, sonnerToast, {
  success: dedup("success"),
  error: dedup("error"),
  warning: dedup("warning"),
  info: dedup("info"),
  loading: dedup("loading"),
});

export { Toaster, toast };
