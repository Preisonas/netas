import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const iconWrap = "inline-flex items-center justify-center h-7 w-7 rounded-md shrink-0 self-center";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      richColors={false}
      position="bottom-right"
      offset={20}
      gap={10}
      visibleToasts={3}
      closeButton
      icons={{
        success: (
          <span className={`${iconWrap} bg-primary/20`}>
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </span>
        ),
        error: (
          <span className={`${iconWrap} bg-destructive/25`}>
            <X className="h-4 w-4 text-white" strokeWidth={3} />
          </span>
        ),
        warning: (
          <span className={`${iconWrap} bg-[hsl(38_95%_55%/0.25)]`}>
            <AlertTriangle className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
        ),
        info: (
          <span className={`${iconWrap} bg-[hsl(210_80%_55%/0.25)]`}>
            <Info className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
        ),
        loading: (
          <span className={`${iconWrap} bg-secondary/60`}>
            <Loader2 className="h-4 w-4 animate-spin text-white" strokeWidth={2.5} />
          </span>
        ),
      }}
      toastOptions={{
        duration: 3500,
        classNames: {
          toast:
            "group !w-[340px] !bg-card !border !border-border/50 !text-foreground !shadow-none !rounded-md !p-3 !flex !flex-row !items-center !gap-3",
          title: "!text-[13px] !font-semibold !leading-tight !text-foreground",
          description: "!text-[12px] !text-muted-foreground !mt-0.5 !leading-snug",
          icon: "!m-0 !p-0 !shrink-0 !self-center !flex !items-center !justify-center [&>svg]:!hidden first:[&>span]:!flex",
          content: "!flex-1 !min-w-0 !flex !flex-col !justify-center",
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

// Dedup wrapper: identical messages within 1.5s reuse the same toast id
const recent = new Map<string, number>();
const DEDUP_MS = 1500;
const keyOf = (msg: unknown, type: string) =>
  `${type}:${typeof msg === "string" ? msg : JSON.stringify(msg)}`;

const wrap = (type: "default" | "success" | "error" | "warning" | "info" | "loading") =>
  (message: any, data?: any) => {
    const k = keyOf(message, type);
    const now = Date.now();
    recent.set(k, now);
    if (recent.size > 50) {
      for (const [key, ts] of recent) if (now - ts > DEDUP_MS * 4) recent.delete(key);
    }
    const opts = { ...data, id: k };
    if (type === "default") return sonnerToast(message, opts);
    return (sonnerToast as any)[type](message, opts);
  };

const baseToast = wrap("default") as unknown as typeof sonnerToast;
const toast = Object.assign(baseToast, sonnerToast, {
  success: wrap("success"),
  error: wrap("error"),
  warning: wrap("warning"),
  info: wrap("info"),
  loading: wrap("loading"),
});

export { Toaster, toast };
