import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Nepavyko prisijungti per Google", {
        description: result.error instanceof Error ? result.error.message : String(result.error),
      });
      setLoading(false);
    }
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
              Prisijunk per Google, kad pasiektum savo paskyrą.
            </p>
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-8 w-full h-12 rounded-sm bg-white text-black hover:bg-white/90 gap-2"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
                <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83Z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38Z"/>
              </svg>
              {loading ? "Nukreipiama..." : "Prisijungti su Google"}
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
