import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Wallet, Landmark, Briefcase, Car, Phone, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CharacterRow {
  id: string;
  identifier: string;
  first_name: string | null;
  last_name: string | null;
  job: string | null;
  job_grade: number | null;
  cash: number | null;
  bank: number | null;
  black_money: number | null;
  metadata: {
    job_label?: string | null;
    phone_number?: string | null;
    vehicles?: Array<{ plate: string; stored: string; model: number }> | null;
  } | null;
  last_synced_at: string;
}

interface PlayerPanelProps {
  onClose: () => void;
}

const fmt = (n: number | null | undefined) => `$${(n ?? 0).toLocaleString("lt-LT")}`;

const PlayerPanel = ({ onClose }: PlayerPanelProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [charsLoading, setCharsLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const hash = window.location.hash;
    if (hash.includes("discord_error=")) {
      const params = new URLSearchParams(hash.slice(1));
      const err = params.get("discord_error");
      if (err) toast.error("Discord prisijungimas nepavyko", { description: err });
      history.replaceState(null, "", window.location.pathname);
    } else if (hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
          if (error) {
            toast.error("Prisijungimas nepavyko", { description: error.message });
          } else {
            toast.success("Sėkmingai prisijungta");
            history.replaceState(null, "", window.location.pathname);
          }
        });
      }
    }

    return () => subscription.unsubscribe();
  }, []);

  const loadCharacters = async () => {
    setCharsLoading(true);
    const { data, error } = await supabase
      .from("characters")
      .select("id, identifier, first_name, last_name, job, job_grade, cash, bank, black_money, metadata, last_synced_at")
      .order("last_synced_at", { ascending: false });
    if (error) {
      toast.error("Nepavyko gauti veikėjų", { description: error.message });
    } else {
      setCharacters((data ?? []) as CharacterRow[]);
    }
    setCharsLoading(false);
  };

  useEffect(() => {
    if (!session) {
      setCharacters([]);
      return;
    }
    loadCharacters();

    // Realtime updates
    const channel = supabase
      .channel("characters-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "characters" }, () => {
        loadCharacters();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

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
    <section className="container flex flex-col items-center min-h-[calc(100vh-120px)] py-16">
      <button
        onClick={onClose}
        className="self-start mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Grįžti
      </button>

      <div className="w-full max-w-3xl text-center">
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
              className="group mt-8 mx-auto max-w-md w-full h-12 rounded-sm bg-[#5865F2] text-white hover:bg-[#4752C4] gap-2 transition-all duration-300 hover:shadow-[0_8px_24px_-8px_rgba(88,101,242,0.6)] hover:-translate-y-0.5"
            >
              <svg viewBox="0 0 71 55" className="h-5 w-5 fill-current transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12" aria-hidden>
                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
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

            {/* Characters */}
            <div className="mt-12 text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Tavo veikėjai</h3>
                <Button
                  onClick={loadCharacters}
                  variant="ghost"
                  size="sm"
                  disabled={charsLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${charsLoading ? "animate-spin" : ""}`} />
                  Atnaujinti
                </Button>
              </div>

              {charsLoading && characters.length === 0 ? (
                <div className="rounded-md border border-border/60 p-6 text-center text-muted-foreground">
                  Kraunama...
                </div>
              ) : characters.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-muted-foreground">
                  Veikėjų dar nėra. Prisijunk prie serverio – jie atsiras automatiškai.
                </div>
              ) : (
                <div className="grid gap-4">
                  {characters.map((c) => {
                    const fullName = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Bevardis";
                    const jobLabel = c.metadata?.job_label || c.job || "—";
                    const vehicles = c.metadata?.vehicles ?? [];
                    return (
                      <div
                        key={c.id}
                        className="rounded-md border border-border/60 bg-card/40 p-5 hover:border-border transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-lg font-semibold">{fullName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{c.identifier}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Atnaujinta: {new Date(c.last_synced_at).toLocaleString("lt-LT")}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <Stat icon={<Wallet className="h-4 w-4" />} label="Cash" value={fmt(c.cash)} />
                          <Stat icon={<Landmark className="h-4 w-4" />} label="Bank" value={fmt(c.bank)} />
                          <Stat icon={<Wallet className="h-4 w-4 text-destructive" />} label="Juodi" value={fmt(c.black_money)} />
                          <Stat icon={<Briefcase className="h-4 w-4" />} label="Darbas" value={`${jobLabel} (${c.job_grade ?? 0})`} />
                        </div>

                        {c.metadata?.phone_number ? (
                          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {c.metadata.phone_number}
                          </div>
                        ) : null}

                        {vehicles.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                              <Car className="h-3.5 w-3.5" /> Transporto priemonės ({vehicles.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {vehicles.map((v) => (
                                <span
                                  key={v.plate}
                                  className="text-xs rounded border border-border/60 bg-background/60 px-2 py-1 font-mono"
                                  title={v.stored}
                                >
                                  {v.plate} · {v.stored}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="mt-8 mx-auto max-w-md w-full h-12 rounded-sm gap-2"
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

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-md bg-background/40 border border-border/40 p-3">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className="mt-1 font-semibold">{value}</p>
  </div>
);

export default PlayerPanel;
