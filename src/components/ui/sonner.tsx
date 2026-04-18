import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      offset={20}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group/toast pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-lg border border-border/60 bg-card/95 px-4 py-3.5 text-foreground shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary data-[type=success]:before:bg-primary data-[type=error]:before:bg-destructive data-[type=warning]:before:bg-[hsl(38_95%_55%)] data-[type=info]:before:bg-[hsl(210_80%_55%)] animate-in slide-in-from-right-4 fade-in duration-300",
          title: "text-sm font-semibold leading-tight",
          description: "text-xs text-muted-foreground mt-0.5 leading-relaxed",
          actionButton:
            "ml-auto inline-flex h-8 items-center rounded-md bg-[image:var(--gradient-brand)] px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 transition",
          cancelButton:
            "ml-auto inline-flex h-8 items-center rounded-md bg-secondary px-3 text-xs font-semibold text-foreground hover:bg-secondary/80 transition",
          closeButton:
            "!bg-transparent !border-0 !text-muted-foreground hover:!text-foreground transition",
          success: "[&>[data-icon]]:text-primary",
          error: "[&>[data-icon]]:text-destructive",
          warning: "[&>[data-icon]]:text-[hsl(38_95%_60%)]",
          info: "[&>[data-icon]]:text-[hsl(210_80%_65%)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
