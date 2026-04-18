import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      offset={20}
      gap={10}
      visibleToasts={4}
      closeButton
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-primary" strokeWidth={2} />,
        error: <XCircle className="h-5 w-5 text-destructive" strokeWidth={2} />,
        warning: <AlertTriangle className="h-5 w-5 text-[hsl(38_95%_60%)]" strokeWidth={2} />,
        info: <Info className="h-5 w-5 text-[hsl(210_80%_65%)]" strokeWidth={2} />,
        loading: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={2} />,
      }}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "!bg-card/95 !border-border/60 !text-foreground !backdrop-blur-xl !shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)] !rounded-lg !px-4 !py-3.5 !w-full relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-border data-[type=success]:before:bg-primary data-[type=error]:before:bg-destructive data-[type=warning]:before:bg-[hsl(38_95%_55%)] data-[type=info]:before:bg-[hsl(210_80%_55%)]",
          title: "!text-sm !font-semibold !leading-tight !text-foreground",
          description: "!text-xs !text-muted-foreground !mt-0.5 !leading-relaxed",
          actionButton:
            "!bg-[image:var(--gradient-brand)] !text-primary-foreground !text-xs !font-semibold !h-8 !px-3 !rounded-md hover:!opacity-90 !transition",
          cancelButton:
            "!bg-secondary !text-foreground !text-xs !font-semibold !h-8 !px-3 !rounded-md hover:!bg-secondary/80 !transition",
          closeButton:
            "!bg-card !border !border-border/60 !text-muted-foreground hover:!text-foreground hover:!bg-secondary !transition !left-auto !right-2 !top-2",
          icon: "!self-start !mt-0.5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
