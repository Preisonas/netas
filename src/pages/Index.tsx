import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import palmsBg from "@/assets/palms-bg.png";
import logo from "@/assets/logo.png";
import logoHero from "@/assets/logo-hero.gif";
import news1 from "@/assets/news-1.png";
import news2 from "@/assets/news-2.png";
import news3 from "@/assets/news-3.png";
import pedHero from "@/assets/ped-hero.png";
import { FolderOpen, ExternalLink, Users } from "lucide-react";

const DISCORD_URL = "https://discord.com/invite/speedrp";
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 127.14 96.36" fill="currentColor" className={className} aria-hidden>
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
  </svg>
);
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import PlayerPanel from "@/components/PlayerPanel";
import PlayerDashboard from "@/components/PlayerDashboard";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const navItems = ["Pradžia", "Parduotuvė", "Wiki", "Taisyklės"];
const JOIN_URL = "https://cfx.re/join/lkzrzv";

const JoinDialog = ({ children }: { children: ReactNode }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Ar tikrai nori prisijungti?</AlertDialogTitle>
        <AlertDialogDescription>
          Būsi nukreiptas į FiveM klientą ir prisijungsi prie Speed Roleplay serverio.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Atšaukti</AlertDialogCancel>
        <AlertDialogAction onClick={() => { window.location.href = JOIN_URL; }}>
          Taip, jungtis
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const Index = () => {
  const [players, setPlayers] = useState<{ clients: number; max: number } | null>(null);
  const [serverStatus, setServerStatus] = useState<"online" | "offline" | "restarting">("restarting");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelInitialSection, setPanelInitialSection] = useState<"profile" | "shop">("profile");
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const openPanel = (section: "profile" | "shop" = "profile") => {
    setPanelInitialSection(section);
    setPanelOpen(true);
  };

  useEffect(() => {
    let mounted = true;

    // 1. Subscribe FIRST so we don't miss any auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      setAuthReady(true);
    });

    // 2. Handle Discord OAuth redirect tokens in URL hash, if present
    const hash = window.location.hash;
    const hashHasTokens = hash && hash.includes("access_token=");

    if (hashHasTokens) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token })
          .then(({ data }) => {
            if (!mounted) return;
            setSession(data.session);
            setAuthReady(true);
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            setPanelOpen(true);
          })
          .catch((e) => {
            console.error("setSession failed", e);
            if (mounted) setAuthReady(true);
          });
      } else if (mounted) {
        setAuthReady(true);
      }
    }

    // 3. Always restore persisted session from storage — critical after remix
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession((prev) => prev ?? data.session);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Verify Stripe checkout on return (credits + VIP subscription)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isCredits = params.get("checkout") === "success";
    const isVip = params.get("vip_checkout") === "success";
    if (!isCredits && !isVip) return;
    const sessionId = params.get("session_id");
    if (!sessionId) return;
    (async () => {
      const fnName = isVip ? "verify-vip-checkout" : "verify-credit-checkout";
      const { data, error } = await supabase.functions.invoke(fnName, { body: { sessionId } });
      if (error) {
        toast.error("Nepavyko patvirtinti mokėjimo");
      } else if (isVip) {
        if (data?.status === "fulfilled") {
          toast.success(data?.gifted ? "VIP padovanotas!" : "VIP aktyvuotas!", {
            description: data?.expires_at ? `Galioja iki ${new Date(data.expires_at).toLocaleString("lt-LT")}` : undefined,
          });
        } else {
          toast.warning("Mokėjimas dar neapmokėtas");
        }
      } else if (data?.status === "fulfilled") {
        toast.success(`Pridėta ${data.added} kreditų. Likutis: ${data.credits}`);
      } else if (data?.status === "already") {
        toast.info("Mokėjimas jau apdorotas");
      } else {
        toast.warning("Mokėjimas dar neapmokėtas");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      setPanelOpen(true);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchPlayers = async () => {
      try {
        const res = await fetch("https://servers-frontend.fivem.net/api/servers/single/lkzrzv");
        if (!res.ok) {
          if (!cancelled) setServerStatus("restarting");
          return;
        }
        const json = await res.json();
        if (!cancelled && json?.Data) {
          setPlayers({
            clients: json.Data.clients ?? 0,
            max: json.Data.svMaxclients ?? json.Data.sv_maxclients ?? 0,
          });
          setServerStatus("online");
        } else if (!cancelled) {
          setServerStatus("restarting");
        }
      } catch (e) {
        console.error("Failed to fetch FiveM players", e);
        if (!cancelled) setServerStatus("offline");
      }
    };
    fetchPlayers();
    const id = setInterval(fetchPlayers, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <PaymentTestModeBanner />
      {/* Background image — hero only */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-screen" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${palmsBg})`,
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 30%, transparent 95%)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 30%, transparent 95%)",
          }}
        />
        <div
          className="absolute inset-0 bg-background/60"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 30%, transparent 95%)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 30%, transparent 95%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <header className="relative z-[60] container flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-2">
              <img src={logo} alt="Speed Roleplay logo" className="h-9 w-9" />
            </a>
            <div className="flex items-center gap-2 rounded-[2px] bg-secondary/60 border border-transparent px-3 py-1.5 text-sm">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">
                <span className="text-foreground">{players ? players.clients : "—"}</span>
                <span className="text-muted-foreground"> / {players ? players.max : "—"}</span>
              </span>
              <span
                aria-label={`Serveris ${serverStatus}`}
                title={
                  serverStatus === "online"
                    ? "Online"
                    : serverStatus === "offline"
                    ? "Offline"
                    : "Restarting"
                }
                className={`ml-1 h-2 w-2 rounded-full ring-2 ring-background/40 ${
                  serverStatus === "online"
                    ? "bg-green-500 shadow-[0_0_6px_hsl(142_76%_45%/0.8)] animate-pulse"
                    : serverStatus === "offline"
                    ? "bg-red-500 shadow-[0_0_6px_hsl(0_84%_60%/0.8)]"
                    : "bg-orange-500 shadow-[0_0_6px_hsl(25_95%_55%/0.8)] animate-pulse"
                }`}
              />
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item, i) => {
              const isHome = i === 0;
              const isShop = item === "Parduotuvė";
              const isDiscordLink = item === "Wiki" || item === "Taisyklės";
              const className = `px-4 py-1.5 text-sm rounded-sm transition-colors ${
                isHome
                  ? "bg-secondary text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`;
              if (isShop) {
                return (
                  <button key={item} onClick={() => openPanel("shop")} className={className}>
                    {item}
                  </button>
                );
              }
              if (isDiscordLink) {
                return (
                  <a key={item} href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className={className}>
                    {item}
                  </a>
                );
              }
              return (
                <a key={item} href="#" className={className}>
                  {item}
                </a>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors shadow-sm"
            >
              <DiscordIcon className="h-[18px] w-[18px]" />
            </a>
            <Button onClick={() => setPanelOpen(true)} className="rounded-sm bg-white text-black hover:bg-white/90 h-8 px-8">
              Žaidėjo panelė
            </Button>
          </div>
        </header>

        {panelOpen ? (
          !authReady ? (
            <div className="container py-24 text-center text-muted-foreground">Kraunama…</div>
          ) : session ? (
            <PlayerDashboard session={session} onClose={() => setPanelOpen(false)} initialSection={panelInitialSection} />
          ) : (
            <PlayerPanel onClose={() => setPanelOpen(false)} />
          )
        ) : (
        <>
        {/* Hero */}
        <section className="container grid lg:grid-cols-2 gap-10 items-center pt-16 pb-28">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              PRISIJUNK PRIE{" "}
              <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">
                SPEED ROLEPLAY
              </span>
              <br />
              IR SUKURK SAVO ISTORIJĄ!
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              Kurk savo istorijas mūsų mieste, kur tik tavo kūrybiškumas yra
              riba.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <JoinDialog>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm h-10 px-7">
                  Žaisti dabar
                </Button>
              </JoinDialog>
              <Button onClick={() => setPanelOpen(true)} variant="outline" className="rounded-sm border-white/30 bg-transparent text-white/70 hover:bg-white/10 hover:text-white/90 h-10 px-10">
                Atidaryti žaidėjo panelę
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <img
                src={logoHero}
                alt="Speed Roleplay logo"
                className="h-32 md:h-40 w-auto"
              />
            </div>
          </div>
        </section>

        {/* News */}
        <section className="container pb-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold">Naujienos ir atnaujinimai!</h2>
            <p className="text-muted-foreground mt-2">
              Sek visas naujienas ir mūsų serverio atnaujinimus.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[news1, news2, news3].map((src, i) => (
              <article
                key={i}
                className="aspect-[4/3] rounded-lg overflow-hidden"
              >
                <img
                  src={src}
                  alt={`News ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </article>
            ))}
          </div>
        </section>

        {/* How to start */}
        <section className="relative overflow-hidden">
          <div className="relative container grid lg:grid-cols-2 gap-4 items-center py-24">
            {/* Ped image */}
            <div className="hidden lg:block relative h-0 group">
              <img
                src={pedHero}
                alt=""
                aria-hidden
                className="absolute right-8 top-1/2 -translate-y-1/2 h-[360px] w-auto max-w-none object-contain grayscale hover:grayscale-0 transition-all duration-500 ease-out"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black 0%, black 65%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to bottom, black 0%, black 65%, transparent 100%)",
                }}
              />
            </div>

            {/* Steps */}
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Kaip pradėti žaisti Speed Roleplay
              </h2>
              <h3 className="text-2xl md:text-3xl font-bold leading-tight mt-1">
                Sek žingsnis po žingsnio ir sukurk savo istoriją!
              </h3>
              <p className="mt-5 text-muted-foreground">
                Speed Roleplay serveryje turi visišką laisvę kurti savo istoriją,
                bendrauti su kitais žaidėjais ir tapti tuo, kuo nori. Vienintelė
                riba — tavo kūrybiškumas! Sek žingsnius, kad teisingai
                prisijungtum prie serverio, o jei kils klausimų — kreipkis į mūsų
                pagalbos komandą.
              </p>

              <div className="mt-8 h-px bg-border/60" />

              {/* Step 1 */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold">
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">1.</span>{" "}
                  Pirmas žingsnis
                </h4>
                <p className="mt-2 text-muted-foreground">
                  Įsigyk{" "}
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent font-medium">
                    GTA V
                  </span>{" "}
                  kopiją į savo kompiuterį.
                  <br />
                  Ji būtina norint prisijungti prie serverio.
                </p>
              </div>

              {/* Step 2 */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold">
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">2.</span>{" "}
                  Antras žingsnis
                </h4>
                <p className="mt-2 text-muted-foreground">
                  Užsiregistruok paskyrą oficialioje{" "}
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent font-medium">
                    Speed Roleplay
                  </span>{" "}
                  svetainėje.
                  <br />
                  Ši paskyra bus naudojama prisijungti prie serverio.
                </p>
              </div>

              {/* Step 3 */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold">
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">3.</span>{" "}
                  Trečias žingsnis
                </h4>
                <p className="mt-2 text-muted-foreground">
                  Atsisiųsk{" "}
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent font-medium">
                    FiveM
                  </span>{" "}
                  ir prisijunk paspaudęs mygtuką „Žaisti“.
                  <br />
                  Tada prisijunk su paskyra, kurią susikūrei svetainėje.
                </p>
                <JoinDialog>
                  <Button
                    variant="outline"
                    className="mt-4 rounded-sm border-transparent bg-secondary/40 text-foreground hover:bg-secondary/60 h-9 px-12 gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Žaisti
                  </Button>
                </JoinDialog>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 mt-12">
          <div className="container py-12 grid lg:grid-cols-2 gap-10">
            <div className="max-w-xl">
              <img src={logo} alt="Speed Roleplay logo" className="h-10 w-auto" />
              <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
                Speed Roleplay nėra susijęs su Take-Two Interactive Software,
                Rockstar North Interactive ar kitais teisių turėtojais. Grand Theft Auto,
                Grand Theft Auto: V ir Grand Theft Auto: San Andreas yra prekės ženklai,
                priklausantys jų atitinkamiems savininkams.
              </p>
            </div>

            <div className="flex lg:justify-end">
              <div className="flex items-start gap-5 max-w-md">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pirkimai žaidime nėra gražinami.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/40">
            <div className="container py-5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Copyright © 2026 · Speed Roleplay.</span>
              <span className="text-foreground">
                Sprendimas: Ather & Mkk
              </span>
            </div>
          </div>
        </footer>
        </>
        )}
      </div>
    </div>
  );
};

export default Index;
