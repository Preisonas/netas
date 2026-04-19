import { Toaster as Sonner, toast } from "sonner";
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      offset={24}
      gap={12}
      visibleToasts={4}
      icons={{
        success: (
          <span className="grid place-items-center h-7 w-7 rounded-full bg-primary/15 ring-1 ring-primary/30">
            <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />
          </span>
        ),
        error: (
          <span className="grid place-items-center h-7 w-7 rounded-full bg-destructive/15 ring-1 ring-destructive/30">
            <X className="h-4 w-4 text-destructive" strokeWidth={2.5} />
          </span>
        ),
        warning: (
          <span className="grid place-items-center h-7 w-7 rounded-full bg-[hsl(38_95%_55%/0.15)] ring-1 ring-[hsl(38_95%_55%/0.3)]">
            <AlertTriangle className="h-4 w-4 text-[hsl(38_95%_60%)]" strokeWidth={2.5} />
          </span>
        ),
        info: (
          <span className="grid place-items-center h-7 w-7 rounded-full bg-[hsl(210_80%_55%/0.15)] ring-1 ring-[hsl(210_80%_55%/0.3)]">
            <Info className="h-4 w-4 text-[hsl(210_80%_65%)]" strokeWidth={2.5} />
          </span>
        ),
        loading: (
          <span className="grid place-items-center h-7 w-7 rounded-full bg-muted/40 ring-1 ring-border">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={2.5} />
          </span>
        ),
      }}
      toastOptions={{
        duration: 3500,
        classNames: {
          toast:
            "!bg-card/95 !border !border-border/50 !text-foreground !backdrop-blur-xl !shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] !rounded-xl !p-3.5 !pr-4 !min-h-0 !w-[340px] !gap-3 !items-center",
          title: "!text-[13px] !font-semibold !leading-snug !text-foreground !tracking-tight",
          description: "!text-[12px] !text-muted-foreground !mt-0.5 !leading-snug",
          actionButton:
            "!bg-[image:var(--gradient-brand)] !text-primary-foreground !text-[11px] !font-semibold !h-7 !px-2.5 !rounded-md hover:!opacity-90 !transition",
          cancelButton:
            "!bg-secondary !text-foreground !text-[11px] !font-semibold !h-7 !px-2.5 !rounded-md hover:!bg-secondary/80 !transition",
          icon: "!shrink-0 !m-0",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
