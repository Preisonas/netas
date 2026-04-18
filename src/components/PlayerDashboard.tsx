import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  LogOut,
  User,
  ShoppingBag,
  Repeat,
  Package,
  Gavel,
  Ticket,
  Trophy,
  UserPlus,
  FileText,
  Users,
  ServerOff,
  MessageSquare,
  Crown,
  Coins,
  Crown as CrownIcon,
  Car,
  Coins as CoinsIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface PlayerDashboardProps {
  session: Session;
  onClose: () => void;
}

type SectionKey =
  | "profile"
  | "shop"
  | "trade"
  | "boxes"
  | "auction"
  | "lottery"
  | "leaderboard"
  | "invites";

const navGroups: { label: string; items: { key: SectionKey; title: string; icon: typeof User; badge?: string }[] }[] = [
  {
    label: "Valdymas",
    items: [
      { key: "profile", title: "Profilis", icon: User },
      { key: "shop", title: "Parduotuvė", icon: ShoppingBag },
      { key: "trade", title: "Automobilių mainai", icon: Repeat },
      { key: "boxes", title: "Dėžės", icon: Package },
      { key: "auction", title: "Aukcionas", icon: Gavel },
      { key: "lottery", title: "Loterija", icon: Ticket },
      { key: "leaderboard", title: "Lyderių sąrašas", icon: Trophy },
      { key: "invites", title: "Pakvietimai", icon: UserPlus },
    ],
  },
];

const PlayerDashboard = ({ session, onClose }: PlayerDashboardProps) => {
  const [active, setActive] = useState<SectionKey>("profile");
  const [profile, setProfile] = useState<{ username: string | null; avatar_url: string | null; discord_id: string | null; email: string | null } | null>(null);

  const meta = session.user.user_metadata as { username?: string; full_name?: string; avatar_url?: string; discord_id?: string } | undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url, discord_id, email")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!cancelled && !error && data) setProfile(data);
    })();
    return () => { cancelled = true; };
  }, [session.user.id]);

  const username = profile?.username ?? meta?.username ?? meta?.full_name ?? session.user.email ?? "Žaidėjas";
  const avatarUrl = profile?.avatar_url ?? meta?.avatar_url;
  const discordId = profile?.discord_id ?? meta?.discord_id;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Atsijungta");
    onClose();
  };

  return (
    <section className="container py-8">
      <button
        onClick={onClose}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Grįžti į pradžią
      </button>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          {/* User card */}
          <div className="rounded-lg border border-border/50 bg-card/40 backdrop-blur-xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="h-11 w-11 rounded-full bg-secondary grid place-items-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{username}</p>
                <p className="text-xs text-muted-foreground truncate">Neturite sukurtų veikėjų</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-semibold">0 €</span>
              </span>
              <button
                onClick={() => setActive("shop")}
                className="text-xs font-medium px-2.5 py-1 rounded bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition"
              >
                Gauti kreditų
              </button>
            </div>

          </div>

          {/* Nav groups */}
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-2 text-xs uppercase tracking-wider text-muted-foreground/70">{group.label}</p>
              <nav className="rounded-lg border border-border/50 bg-card/30 backdrop-blur-xl p-1.5">
                {group.items.map(({ key, title, icon: Icon, badge }) => {
                  const isActive = active === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActive(key)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                        {title}
                      </span>
                      {badge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/60">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full rounded-md gap-2 border-border/50 bg-card/30 backdrop-blur-xl hover:bg-secondary/70"
          >
            <LogOut className="h-4 w-4" />
            Atsijungti
          </Button>
        </aside>

        {/* Content */}
        <main className="rounded-lg border border-border/50 bg-card/30 backdrop-blur-xl p-6 md:p-8 min-h-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
          {active === "profile" && (
            <ProfileSection username={username} avatarUrl={avatarUrl} discordId={discordId} email={session.user.email ?? ""} />
          )}
          {active === "shop" && <ShopSection />}
          {active !== "profile" && active !== "shop" && <Placeholder title={titleFor(active)} />}
        </main>
      </div>
    </section>
  );
};

const titleFor = (k: SectionKey) =>
  navGroups.flatMap((g) => g.items).find((i) => i.key === k)?.title ?? "";

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6">
    <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
    {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
  </div>
);

const ProfileSection = ({
  username,
  avatarUrl,
  discordId,
  email,
}: { username: string; avatarUrl?: string | null; discordId?: string | null; email: string }) => (
  <>
    <SectionHeader title="Profilis" subtitle="Tavo paskyros informacija." />
    <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
      <div className="relative">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-32 w-32 rounded-xl object-cover ring-2 ring-primary/40" />
        ) : (
          <div className="h-32 w-32 rounded-xl bg-secondary grid place-items-center">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="space-y-3">
        <Field label="Vartotojo vardas" value={username} />
        <Field label="El. paštas" value={email} />
        <Field label="Discord ID" value={discordId ?? "—"} mono />
        <div className="pt-2">
          <p className="text-sm text-muted-foreground">
            Veikėjų informacija (FiveM) bus sinchronizuojama vėliau pagal tavo Discord ID.
          </p>
        </div>
      </div>
    </div>
  </>
);

const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-xs uppercase tracking-wider text-muted-foreground/70">{label}</p>
    <p className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
  </div>
);

const shopItems = [
  { id: 1, name: "1 000 kreditų", price: "4.99 €", icon: CoinsIcon, tag: "Populiaru" },
  { id: 2, name: "5 500 kreditų", price: "19.99 €", icon: CoinsIcon, tag: "+10%" },
  { id: 3, name: "12 000 kreditų", price: "39.99 €", icon: CoinsIcon, tag: "+20%" },
  { id: 4, name: "VIP – 30 dienų", price: "9.99 €", icon: CrownIcon, tag: "VIP" },
  { id: 5, name: "VIP+ – 30 dienų", price: "19.99 €", icon: Sparkles, tag: "VIP+" },
  { id: 6, name: "Garažo +1 vieta", price: "2.99 €", icon: Car, tag: "Naujas" },
];

const ShopSection = () => (
  <>
    <SectionHeader title="Parduotuvė" subtitle="Įsigyk kreditų, VIP statusą ir kitas privilegijas." />
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {shopItems.map((it) => (
        <article
          key={it.id}
          className="group relative rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary/50 p-5 transition-colors overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
            style={{ background: "var(--gradient-brand)" }}
          />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-md bg-background/60 grid place-items-center border border-border/60">
                <it.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-background/60 border border-border/60 text-muted-foreground">
                {it.tag}
              </span>
            </div>
            <h3 className="mt-4 font-semibold">{it.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">Akimirksniu pristatoma į žaidimą.</p>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-lg font-bold bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">
                {it.price}
              </span>
              <button
                onClick={() => toast.info("Greitai bus galima pirkti")}
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition"
              >
                Pirkti
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  </>
);

const Placeholder = ({ title }: { title: string }) => (
  <div className="h-full grid place-items-center min-h-[500px] text-center">
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-muted-foreground">Šis skyrius greitai bus prieinamas.</p>
    </div>
  </div>
);

export default PlayerDashboard;
