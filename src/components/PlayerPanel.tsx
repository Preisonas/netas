import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";

interface PlayerPanelProps {
  onClose: () => void;
}

const PlayerPanel = ({ onClose }: PlayerPanelProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);

  const handleDiscordLogin = () => {
    setLoading(true);
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const returnTo = encodeURIComponent(window.location.origin);
    window.location.href = `https://${projectId}.supabase.co/functions/v1/discord-auth-start?return_to=${returnTo}`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Atsijungta");
  };

  const user = session?.user;
  const meta = user?.user_metadata as { full_name?: string; name?: string; avatar_url?: string } | undefined;

  return (
    <section className="container flex flex-col items-center justify-center min-h-[calc(100vh-120px)] py-16">
      <button
        onClick={onClose}
        className="self-start mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Grįžti
      </button>

      <div className="w-full max-w-md text-center">
        <h2 className="text-3xl md:text-4xl font-bold">
          <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">
            Žaidėjo panelė
          </span>
        </h2>

        {!session ? (
          <>
            <p className="mt-3 text-muted-foreground">
              Prisijunk per Discord, kad pasiektum savo paskyrą.
            </p>
            <Button
              onClick={handleDiscordLogin}
              disabled={loading}
              className="mt-8 w-full h-12 rounded-sm bg-[#5865F2] text-white hover:bg-[#4752C4] gap-2"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
                <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a13.94 13.94 0 0 0-.617 1.265 18.27 18.27 0 0 0-5.482 0A13.51 13.51 0 0 0 9.842 3a19.74 19.74 0 0 0-3.76 1.369C2.68 9.464 1.79 14.43 2.235 19.323A19.9 19.9 0 0 0 8.27 22.5c.485-.66.92-1.36 1.293-2.094-.71-.267-1.39-.595-2.04-.98.171-.126.338-.257.5-.392 3.927 1.83 8.18 1.83 12.06 0 .163.137.33.27.5.392-.65.385-1.33.715-2.04.98.374.733.808 1.434 1.293 2.094a19.85 19.85 0 0 0 6.036-3.177c.522-5.66-.892-10.58-3.555-14.954ZM9.5 16.13c-1.18 0-2.15-1.085-2.15-2.42 0-1.335.95-2.42 2.15-2.42 1.21 0 2.17 1.095 2.15 2.42 0 1.335-.95 2.42-2.15 2.42Zm5.07 0c-1.18 0-2.15-1.085-2.15-2.42 0-1.335.95-2.42 2.15-2.42 1.21 0 2.17 1.095 2.15 2.42 0 1.335-.94 2.42-2.15 2.42Z" />
              </svg>
              {loading ? "Nukreipiama..." : "Prisijungti su Discord"}
            </Button>
          </>
        ) : (
          <>
            <div className="mt-8 flex flex-col items-center gap-3">
              {meta?.avatar_url && (
                <img src={meta.avatar_url} alt="" className="h-20 w-20 rounded-full" />
              )}
              <div>
                <p className="font-semibold text-lg">{meta?.full_name ?? meta?.name ?? user.email}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="mt-8 w-full h-12 rounded-sm gap-2"
            >
              <LogOut className="h-4 w-4" />
              Atsijungti
            </Button>
          </>
        )}
      </div>
    </section>
  );
};

export default PlayerPanel;
