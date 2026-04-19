import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  LogOut,
  User,
  ShoppingBag,
  Package,
  Coins,
  Search,
  Gauge,
  Briefcase,
  Check,
  Clock,
  Wallet,
  Minus,
  Plus,
  Tag,
  CreditCard,
  X,
  Sparkles,
  Shirt,
  Car,
  Crown,
  Flame,
  Gift,
  Shield,
  AlertTriangle,
} from "lucide-react";

const OWNER_DISCORD_IDS = ["1276583745490649214", "528409152024870922"];
import { toast } from "sonner";
import caseStarterImg from "@/assets/cases/starter.png";
import caseVehicleImg from "@/assets/cases/vehicle.png";
import caseVipImg from "@/assets/cases/vip.png";
import casePremiumImg from "@/assets/cases/premium.png";
import caseLegendaryImg from "@/assets/cases/legendary.png";
import shopMclaren from "@/assets/shop-mclaren.png";
import cardBackImg from "@/assets/cases/card-back.png";
import CasesManager from "@/components/admin/CasesManager";
import VehiclesManager from "@/components/admin/VehiclesManager";

interface PlayerDashboardProps {
  session: Session;
  onClose: () => void;
}

type SectionKey =
  | "profile"
  | "shop"
  | "boxes"
  | "credits"
  | "admin-credits"
  | "admin-cases"
  | "admin-vehicles";

type NavGroup = { label: string; items: { key: SectionKey; title: string; icon: typeof User; badge?: string }[] };

const baseNavGroups: NavGroup[] = [
  {
    label: "Valdymas",
    items: [
      { key: "profile", title: "Profilis", icon: User },
      { key: "shop", title: "Parduotuvė", icon: ShoppingBag },
      { key: "boxes", title: "Dėžės", icon: Package },
    ],
  },
];

const ownerNavGroup: NavGroup = {
  label: "Owner",
  items: [
    { key: "admin-credits", title: "Duoti kreditų", icon: Shield },
    { key: "admin-cases", title: "Dėžės (valdymas)", icon: Package },
    { key: "admin-vehicles", title: "Transportas (valdymas)", icon: Car },
  ],
};

const PlayerDashboard = ({ session, onClose }: PlayerDashboardProps) => {
  const [active, setActive] = useState<SectionKey>("profile");
  const [profile, setProfile] = useState<{ username: string | null; avatar_url: string | null; discord_id: string | null; email: string | null; credits: number } | null>(null);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const meta = session.user.user_metadata as { username?: string; full_name?: string; avatar_url?: string; discord_id?: string } | undefined;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url, discord_id, email, credits")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!cancelled && !error && data) setProfile(data);
    };
    load();

    const channel = supabase
      .channel(`profile-changes-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${session.user.id}` },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session.user.id]);

  const username = profile?.username ?? meta?.username ?? meta?.full_name ?? session.user.email ?? "Žaidėjas";
  const avatarUrl = profile?.avatar_url ?? meta?.avatar_url;
  const discordId = profile?.discord_id ?? meta?.discord_id;
  const credits = profile?.credits ?? 0;
  const isOwner = !!discordId && OWNER_DISCORD_IDS.includes(discordId);
  const navGroups = isOwner ? [...baseNavGroups, ownerNavGroup] : baseNavGroups;

  useEffect(() => {
    if (!discordId) { setCharacterCount(0); return; }
    let cancelled = false;
    const loadCount = async () => {
      const { count } = await supabase
        .from("characters")
        .select("id", { count: "exact", head: true })
        .eq("discord_id", discordId);
      if (!cancelled) setCharacterCount(count ?? 0);
    };
    loadCount();
    const channel = supabase
      .channel(`characters-count-${discordId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "characters", filter: `discord_id=eq.${discordId}` }, () => loadCount())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [discordId]);

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
                <p className="text-xs text-muted-foreground truncate">
                  {characterCount > 0 ? `${characterCount} veikėj${characterCount === 1 ? "as" : "ai"}` : "Neturite sukurtų veikėjų"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-semibold">{credits} €</span>
              </span>
              <button
                onClick={() => setActive("credits")}
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
          {active === "credits" && <CreditsSection />}
          {active === "boxes" && <BoxesSection />}
          {active === "admin-credits" && isOwner && <AdminCreditsSection />}
          {active === "admin-cases" && isOwner && (
            <>
              <SectionHeader title="Dėžės (valdymas)" subtitle="Kurk, redaguok ir trink dėžes." />
              <CasesManager />
            </>
          )}
          {active === "admin-vehicles" && isOwner && (
            <>
              <SectionHeader title="Transportas (valdymas)" subtitle="Kurk, redaguok ir trink transporto priemones." />
              <VehiclesManager />
            </>
          )}
          {active !== "profile" && active !== "shop" && active !== "credits" && active !== "boxes" && active !== "admin-credits" && active !== "admin-cases" && active !== "admin-vehicles" && <Placeholder title={titleFor(active)} />}
        </main>
      </div>
    </section>
  );
};

const titleFor = (k: SectionKey) =>
  [...baseNavGroups, ownerNavGroup].flatMap((g) => g.items).find((i) => i.key === k)?.title ?? "";

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6">
    <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
    {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
  </div>
);

interface Character {
  id: string;
  firstName: string;
  lastName: string;
  money: number;
  bank: number;
  job: string;
  playtimeMinutes: number;
}

// Placeholder list used by shop/boxes "deliver to character" pickers.
// TODO: replace with real per-user characters fetched from the `characters` table.
const mockCharacters: Character[] = [];

const ProfileSection = ({
  username,
  avatarUrl,
  discordId,
  email,
}: { username: string; avatarUrl?: string | null; discordId?: string | null; email: string }) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!discordId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("characters")
        .select("id, first_name, last_name, job, cash, bank, metadata, last_synced_at")
        .eq("discord_id", discordId)
        .order("last_synced_at", { ascending: false });
      if (cancelled) return;
      if (!error && data) {
        setCharacters(
          data.map((c) => {
            const md = (c.metadata as { job_label?: string | null } | null) ?? null;
            return {
              id: c.id,
              firstName: c.first_name ?? "",
              lastName: c.last_name ?? "",
              money: c.cash ?? 0,
              bank: c.bank ?? 0,
              job: md?.job_label || c.job || "—",
              playtimeMinutes: 0,
            };
          })
        );
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`characters-${discordId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "characters", filter: `discord_id=eq.${discordId}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [discordId]);

  return (
    <>
      <SectionHeader title="Profilis" subtitle="Tavo paskyra ir veikėjai." />

      <div className="flex items-center gap-4 mb-8">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-secondary grid place-items-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="text-xl font-bold">{username}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
          <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">Discord ID: {discordId ?? "—"}</p>
        </div>
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">Veikėjai</h3>
        <span className="text-xs text-muted-foreground">{characters.length} / 3</span>
      </div>

      {loading ? (
        <div className="rounded-xl bg-secondary/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Kraunama...</p>
        </div>
      ) : characters.length === 0 ? (
        <div className="rounded-xl bg-secondary/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Veikėjų dar nėra. Kai prisijungsi prie serverio, jie atsiras čia automatiškai.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {characters.map((c) => (
            <CharacterCard key={c.id} character={c} />
          ))}
        </div>
      )}
    </>
  );
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat("lt-LT").format(n) + " $";

const formatPlaytime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const CharacterCard = ({ character: c }: { character: Character }) => (
  <article className="group relative rounded-xl overflow-hidden bg-secondary/30 hover:bg-secondary/50 transition-colors p-5">
    <div
      aria-hidden
      className="absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-15 blur-3xl"
      style={{ background: "var(--gradient-brand)" }}
    />
    <div className="relative">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-bold leading-tight">
            {c.firstName} {c.lastName}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            {c.job}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatPlaytime(c.playtimeMinutes)}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-background/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Grynais</p>
          <p className="mt-1 text-sm font-bold inline-flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-primary" />
            {formatMoney(c.money)}
          </p>
        </div>
        <div className="rounded-lg bg-background/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Banke</p>
          <p className="mt-1 text-sm font-bold inline-flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            {formatMoney(c.bank)}
          </p>
        </div>
      </div>
    </div>
  </article>
);

interface ShopVehicle {
  id: string;
  brand: string;
  model: string;
  price: number;
  speed: number;
  trunk?: number;
  image?: string;
  features: string[];
}

const ShopSection = () => {
  const [query, setQuery] = useState("");
  const [sortByPrice, setSortByPrice] = useState(false);
  const [vehicles, setVehicles] = useState<ShopVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, price, top_speed, trunk, image_url, features")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (!error && data) {
          setVehicles(
            data.map((v) => ({
              id: v.id,
              brand: v.brand,
              model: v.model,
              price: v.price,
              speed: v.top_speed,
              trunk: v.trunk ?? undefined,
              image: v.image_url ?? undefined,
              features: v.features ?? [],
            }))
          );
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = vehicles.filter((v) => {
      const q = query.trim().toLowerCase();
      return !q || `${v.brand} ${v.model}`.toLowerCase().includes(q);
    });
    if (sortByPrice) list = [...list].sort((a, b) => a.price - b.price);
    return list;
  }, [query, sortByPrice, vehicles]);

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold lg:mr-auto">Parduotuvė</h2>

        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paieška..."
            className="w-full h-9 pl-9 pr-3 rounded-md bg-secondary/60 border border-border/60 text-sm outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground"
          />
        </div>

        <button
          onClick={() => setSortByPrice((s) => !s)}
          className={`shrink-0 px-3 h-9 rounded-md text-xs font-medium transition-colors border border-border/60 ${
            sortByPrice ? "bg-background text-foreground" : "bg-secondary/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          Rūšiuoti pagal kainą
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <p className="col-span-full text-center text-muted-foreground py-12">Kraunama…</p>
        ) : filtered.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-12">Nėra transporto.</p>
        ) : (
          filtered.map((v) => <VehicleCard key={v.id} vehicle={v} />)
        )}
      </div>
    </>
  );
};

const VehicleCard = ({ vehicle: v }: { vehicle: ShopVehicle }) => {
  return (
    <article className="group relative rounded-xl overflow-hidden bg-secondary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-background/60">
        {v.image ? (
          <img
            src={v.image}
            alt={`${v.brand} ${v.model}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-[80px] font-black text-foreground/5 tracking-tighter select-none">
              {v.brand.slice(0, 3).toUpperCase()}
            </span>
          </div>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
      </div>

      <div className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground/80">{v.brand}</p>
        <h3 className="text-lg font-bold leading-tight">{v.model}</h3>

        <div className="mt-3 flex items-center flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/15 text-primary font-semibold">
            <Coins className="h-3.5 w-3.5" />
            {v.price} €
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/60 text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            ~ {v.speed} km/h
          </span>
          {v.trunk && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/60 text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              {v.trunk} kg
            </span>
          )}
        </div>

        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-1.5">Modelio informacija</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {v.features.slice(0, 4).map((f) => (
              <li key={f} className="inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <BuyWithCharacter itemName={`${v.brand} ${v.model}`} />
      </div>
    </article>
  );
};

const BuyWithCharacter = ({ itemName }: { itemName: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          if (mockCharacters.length === 0) {
            toast.error("Neturite veikėjų. Prisijunk prie serverio.");
            return;
          }
          setOpen(true);
        }}
        className="mt-4 w-full h-9 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition"
      >
        Pirkti
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border/60 bg-card/90 backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold">Pasirink veikėją</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Į kurio veikėjo paskyrą pristatyti{" "}
              <span className="text-foreground font-medium">{itemName}</span>?
            </p>
            <div className="space-y-2">
              {mockCharacters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    toast.success(`${itemName} priskirtas: ${c.firstName} ${c.lastName}`);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-md bg-secondary/50 hover:bg-secondary transition text-left"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3" />
                      {c.job}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Wallet className="h-3 w-3 text-primary" />
                    {formatMoney(c.bank)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const CreditsSection = () => {
  const [amount, setAmount] = useState(10);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const presets = [5, 10, 25, 50, 100, 250];

  const subtotal = amount;
  const discountValue = +(subtotal * discount).toFixed(2);
  const total = +(subtotal - discountValue).toFixed(2);

  const applyCode = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const codes: Record<string, number> = { MKKAHUJIENAS30: 0.3 };
    if (codes[c] !== undefined) {
      setDiscount(codes[c]);
      toast.success(`Pritaikyta nuolaida -${codes[c] * 100}%`);
    } else {
      setDiscount(0);
      toast.error("Nuolaidos kodas neegzistuoja");
    }
  };

  return (
    <>
      <SectionHeader title="Gauti kreditų" subtitle="1 kreditas = 1 €. Naudok parduotuvėje, dėžėse ar aukcione." />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="rounded-xl bg-secondary/30 p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 mb-3">Pasirink sumą</p>

          <div className="flex items-center justify-center gap-4 py-6">
            <button
              onClick={() => setAmount((a) => Math.max(1, a - 1))}
              className="h-11 w-11 rounded-full bg-background/60 hover:bg-background transition grid place-items-center"
              aria-label="Mažiau"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="relative">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
                className="w-40 text-center text-4xl font-black bg-transparent outline-none border-b-2 border-border/60 focus:border-primary/60 transition pb-1"
              />
              <span className="block text-center text-xs uppercase tracking-wider text-muted-foreground mt-2">
                kreditų (€)
              </span>
            </div>

            <button
              onClick={() => setAmount((a) => a + 1)}
              className="h-11 w-11 rounded-full bg-background/60 hover:bg-background transition grid place-items-center"
              aria-label="Daugiau"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={`h-10 rounded-md text-sm font-semibold transition ${
                  amount === p
                    ? "bg-[image:var(--gradient-brand)] text-primary-foreground"
                    : "bg-background/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}€
              </button>
            ))}
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground/80 mb-2 inline-flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Nuolaidos kodas
            </p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="pvz. MKKAHUJIENAS30"
                className="flex-1 h-10 px-3 rounded-md bg-background/60 border border-border/60 text-sm outline-none focus:border-primary/60 transition placeholder:text-muted-foreground"
              />
              <button
                onClick={applyCode}
                className="h-10 px-4 rounded-md text-sm font-semibold bg-secondary hover:bg-secondary/80 transition"
              >
                Pritaikyti
              </button>
            </div>
            {discount > 0 && (
              <p className="text-xs text-primary mt-2">Nuolaida -{discount * 100}% pritaikyta.</p>
            )}
          </div>
        </div>

        <aside className="rounded-xl bg-secondary/30 p-6 h-fit">
          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 mb-4">Užsakymo santrauka</p>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Kreditai</span>
              <span className="font-semibold">{amount} €</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-primary">
                <span>Nuolaida</span>
                <span>-{discountValue.toFixed(2)} €</span>
              </div>
            )}
            <div className="h-px bg-border/60 my-2" />
            <div className="flex items-center justify-between text-base">
              <span className="font-semibold">Iš viso</span>
              <span className="text-xl font-black">{total.toFixed(2)} €</span>
            </div>
          </div>

          <button
            onClick={() => toast.info("Mokėjimo integracija greitai")}
            className="mt-5 w-full h-11 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition inline-flex items-center justify-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Pirkti {total.toFixed(2)} €
          </button>

          <p className="text-[11px] text-muted-foreground/70 mt-3 text-center">
            Saugus mokėjimas. Kreditai bus pridėti akimirksniu.
          </p>
        </aside>
      </div>
    </>
  );
};

const Placeholder = ({ title }: { title: string }) => (
  <div className="h-full grid place-items-center min-h-[500px] text-center">
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-muted-foreground">Šis skyrius greitai bus prieinamas.</p>
    </div>
  </div>
);

// ============================================================
// CASES (Dėžės)
// ============================================================

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

interface CaseItem {
  id: string;
  name: string;
  rarity: Rarity;
  weight: number;
  kind: "vehicle" | "credits" | "cosmetic";
  value?: number;
}

interface LootBox {
  id: string;
  name: string;
  tagline: string;
  price: number;
  icon: typeof Package;
  accent: string;
  image?: string;
  pool: CaseItem[];
}

// English rarity labels with subtle badge colors. One hue family per tier, no glows.
const rarityStyles: Record<Rarity, { text: string; ring: string; label: string; bar: string; badge: string }> = {
  common:    { text: "text-muted-foreground",   ring: "ring-border/60",             label: "DAŽNAS",     bar: "bg-muted-foreground/50",       badge: "bg-muted-foreground/15 text-muted-foreground border border-muted-foreground/20" },
  rare:      { text: "text-[hsl(210_80%_70%)]", ring: "ring-[hsl(210_80%_55%)]/40", label: "RETAS",      bar: "bg-[hsl(210_80%_55%)]",        badge: "bg-[hsl(210_80%_55%)]/15 text-[hsl(210_80%_75%)] border border-[hsl(210_80%_55%)]/30" },
  epic:      { text: "text-[hsl(265_75%_72%)]", ring: "ring-[hsl(265_75%_60%)]/45", label: "EPINIS",     bar: "bg-[hsl(265_75%_60%)]",        badge: "bg-[hsl(265_75%_60%)]/15 text-[hsl(265_75%_75%)] border border-[hsl(265_75%_60%)]/30" },
  legendary: { text: "text-[hsl(38_95%_65%)]",  ring: "ring-[hsl(38_95%_55%)]/45",  label: "LEGENDINIS", bar: "bg-[hsl(38_95%_55%)]",         badge: "bg-[hsl(38_95%_55%)]/15 text-[hsl(38_95%_70%)] border border-[hsl(38_95%_55%)]/30" },
  mythic:    { text: "text-primary",            ring: "ring-primary/50",            label: "MITINIS",    bar: "bg-primary",                   badge: "bg-primary/15 text-primary border border-primary/30" },
};

// Auto-derive rarity from chance % for visual styling only
const rarityFromChance = (chance: number): Rarity => {
  if (chance >= 30) return "common";
  if (chance >= 15) return "rare";
  if (chance >= 5) return "epic";
  if (chance >= 1) return "legendary";
  return "mythic";
};

const rarityIcon = (kind: CaseItem["kind"]) => {
  if (kind === "vehicle") return Car;
  if (kind === "cosmetic") return Shirt;
  return Coins;
};

const BoxesSection = () => {
  const [openingBox, setOpeningBox] = useState<LootBox | null>(null);
  const [boxes, setBoxes] = useState<LootBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const [casesRes, itemsRes, profileRes] = await Promise.all([
        supabase.from("cases").select("id, name, image_url, price").order("created_at", { ascending: false }),
        supabase.from("case_items").select("id, case_id, label, item_name, chance"),
        session
          ? supabase.from("profiles").select("credits").eq("user_id", session.user.id).maybeSingle()
          : Promise.resolve({ data: null as { credits: number } | null }),
      ]);
      if (cancelled) return;
      const cases = casesRes.data;
      const items = itemsRes.data;
      if (profileRes.data) setCredits(profileRes.data.credits ?? 0);
      const byCase = new Map<string, LootBox["pool"]>();
      (items ?? []).forEach((it) => {
        const arr = byCase.get(it.case_id) ?? [];
        arr.push({
          id: it.id,
          name: it.label,
          rarity: rarityFromChance(Number(it.chance)),
          weight: Number(it.chance),
          kind: "credits",
        });
        byCase.set(it.case_id, arr);
      });
      setBoxes(
        (cases ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          tagline: "",
          price: c.price,
          icon: Package,
          accent: "210 90% 60%",
          image: c.image_url ?? undefined,
          pool: byCase.get(c.id) ?? [],
        }))
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <SectionHeader title="Dėžės" subtitle="Atidaryk dėžes ir laimėk daiktus." />

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Kraunama…</p>
      ) : boxes.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Dar nėra dėžių.</p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {boxes.map((box) => (
            <BoxCard key={box.id} box={box} onOpen={() => {
              if (box.pool.length === 0) {
                toast.error("Šioje dėžėje dar nėra daiktų");
                return;
              }
              if (credits < box.price) {
                toast.error("Neturi pakankamai kreditų", {
                  description: `Reikia ${box.price} €, o turi tik ${credits} €.`,
                });
                return;
              }
              setOpeningBox(box);
            }} />
          ))}
        </div>
      )}

      {openingBox && (
        <CaseOpeningModal box={openingBox} onClose={() => setOpeningBox(null)} />
      )}
    </>
  );
};

const BoxCard = ({ box, onOpen }: { box: LootBox; onOpen: () => void }) => {
  const Icon = box.icon;
  return (
    <article className="group relative rounded-xl overflow-hidden bg-secondary/30 transition-colors hover:bg-secondary/50 flex flex-col h-full">
      {/* Image header — fixed aspect ratio so all cards align */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-background/40">
        {box.image ? (
          <img
            src={box.image}
            alt={box.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="h-12 w-12 text-primary/70" />
          </div>
        )}
        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur text-primary text-xs font-bold">
          <Coins className="h-3.5 w-3.5" />
          {box.price} €
        </span>
      </div>

      {/* Body — flex-1 so all cards match height regardless of badge count */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-lg font-bold leading-tight">{box.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{box.tagline}</p>


        <button
          onClick={onOpen}
          className="mt-auto pt-5 w-full"
        >
          <span className="flex items-center justify-center gap-2 h-10 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition">
            <Package className="h-4 w-4" />
            Atidaryti už {box.price} €
          </span>
        </button>
      </div>
    </article>
  );
};

const pickWeighted = (pool: CaseItem[]): CaseItem => {
  const total = pool.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1];
};


const CARD_COUNT = 5;

type Phase = "idle" | "shuffling" | "picking" | "revealing" | "done";

const CaseOpeningModal = ({ box, onClose }: { box: LootBox; onClose: () => void }) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<CaseItem[]>([]);
  const [winnerIdx, setWinnerIdx] = useState<number>(-1);
  const [pickedIdx, setPickedIdx] = useState<number>(-1);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [selectingChar, setSelectingChar] = useState(false);

  const winner = winnerIdx >= 0 ? cards[winnerIdx] : null;

  const startOpen = () => {
    if (phase !== "idle") return;
    const w = pickWeighted(box.pool);
    const wIndex = Math.floor(Math.random() * CARD_COUNT);
    const c: CaseItem[] = [];
    for (let i = 0; i < CARD_COUNT; i++) {
      c.push(i === wIndex ? w : pickWeighted(box.pool));
    }
    setCards(c);
    setWinnerIdx(wIndex);
    setPickedIdx(-1);
    setFlipped({});
    setPhase("shuffling");
    window.setTimeout(() => setPhase("picking"), 1100);
  };

  const handlePick = (idx: number) => {
    if (phase !== "picking") return;
    setPickedIdx(idx);
    setPhase("revealing");
    setFlipped((f) => ({ ...f, [idx]: true }));
    window.setTimeout(() => {
      // Reveal the rest with stagger
      setFlipped(() => {
        const all: Record<number, boolean> = {};
        for (let i = 0; i < CARD_COUNT; i++) all[i] = true;
        return all;
      });
    }, 900);
    window.setTimeout(() => {
      setPhase("done");
      const w = cards[winnerIdx];
      // Force the winner to be the picked card visually
      toast.success(`Laimėjai: ${cards[idx].name}!`);
      // Update the actual winner reference to picked card so payouts match what user sees
      setWinnerIdx(idx);
      void w;
    }, 1700);
  };

  const reset = () => {
    setPhase("idle");
    setCards([]);
    setWinnerIdx(-1);
    setPickedIdx(-1);
    setFlipped({});
    setSelectingChar(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4"
      onClick={() => phase !== "shuffling" && phase !== "revealing" && onClose()}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl md:text-2xl font-bold">{box.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {phase === "picking" ? "Pasirink kortelę" : phase === "shuffling" ? "Maišoma…" : box.tagline}
            </p>
          </div>
          {phase !== "shuffling" && phase !== "revealing" && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="relative min-h-[280px] rounded-xl bg-background/40 border border-border/50 px-4 py-8 grid place-items-center overflow-hidden">
          {phase === "idle" ? (
            <div className="text-center space-y-1">
              <Package className="h-10 w-10 mx-auto text-muted-foreground" strokeWidth={1.25} />
              <p className="text-sm text-muted-foreground">Paspausk „Atidaryti", kad atskleistum {CARD_COUNT} korteles.</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
              {cards.map((item, idx) => (
                <FlipCard
                  key={idx}
                  item={item}
                  index={idx}
                  flipped={!!flipped[idx]}
                  picked={pickedIdx === idx}
                  phase={phase}
                  onPick={() => handlePick(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {phase === "done" && winner && (
          <div className="mt-6 rounded-xl p-5 border border-border/50 bg-secondary/30 animate-fade-in">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Laimėjai</p>
            <div className="mt-1 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h4 className="text-2xl font-black text-foreground">{winner.name}</h4>
                <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded text-[10px] tracking-wider font-bold ${rarityStyles[winner.rarity].badge}`}>
                  {rarityStyles[winner.rarity].label}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectingChar(true)}
                  className="h-10 px-4 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition"
                >
                  Atsiimti
                </button>
                <button
                  onClick={reset}
                  className="h-10 px-4 rounded-md text-sm font-semibold bg-secondary hover:bg-secondary/80 transition"
                >
                  Atidaryti dar kartą
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "idle" && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Dėžės kaina: <span className="text-foreground font-semibold">{box.price} €</span>
            </p>
            <button
              onClick={startOpen}
              className="h-11 px-6 rounded-md text-sm font-bold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition inline-flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Atidaryti už {box.price} €
            </button>
          </div>
        )}

        {(phase === "shuffling" || phase === "picking" || phase === "revealing") && (
          <p className="mt-6 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {phase === "shuffling" && "Maišoma…"}
            {phase === "picking" && "Pasirink savo kortelę"}
            {phase === "revealing" && "Atskleidžiama…"}
          </p>
        )}

        {selectingChar && winner && (
          <div
            className="absolute inset-0 z-30 grid place-items-center bg-background/85 backdrop-blur-md p-6 rounded-2xl"
            onClick={() => setSelectingChar(false)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-border/60 bg-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold">Pasirink veikėją</h3>
                <button onClick={() => setSelectingChar(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Į kurio veikėjo paskyrą pristatyti{" "}
                <span className="text-foreground font-medium">{winner.name}</span>?
              </p>
              {mockCharacters.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Veikėjų nėra.</p>
              ) : (
                <div className="space-y-2">
                  {mockCharacters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        toast.success(`${winner.name} priskirtas: ${c.firstName} ${c.lastName}`);
                        setSelectingChar(false);
                        reset();
                        onClose();
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-md bg-secondary/50 hover:bg-secondary transition text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3" />
                          {c.job}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <Wallet className="h-3 w-3 text-primary" />
                        {formatMoney(c.bank)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FlipCard = ({
  item,
  index,
  flipped,
  picked,
  phase,
  onPick,
}: {
  item: CaseItem;
  index: number;
  flipped: boolean;
  picked: boolean;
  phase: Phase;
  onPick: () => void;
}) => {
  const r = rarityStyles[item.rarity];
  const Icon = rarityIcon(item.kind);
  const interactive = phase === "picking";
  const dimmed = (phase === "revealing" || phase === "done") && !picked;
  const shuffleAnim =
    phase === "shuffling"
      ? { animation: `cardShuffle 1s cubic-bezier(0.4, 0, 0.2, 1) ${index * 60}ms both` }
      : undefined;

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={!interactive}
      className={`group relative w-28 md:w-36 aspect-[2/3] [perspective:1000px] outline-none transition-all duration-500 ${
        interactive ? "hover:-translate-y-2 cursor-pointer" : "cursor-default"
      } ${dimmed ? "opacity-40 scale-95" : ""} ${picked && phase === "done" ? "scale-105" : ""}`}
      style={shuffleAnim}
      aria-label={interactive ? `Pasirink kortelę ${index + 1}` : item.name}
    >
      <div
        className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Back face */}
        <div className="absolute inset-0 rounded-xl overflow-hidden [backface-visibility:hidden]">
          <img
            src={cardBackImg}
            alt=""
            aria-hidden
            className={`h-full w-full object-cover transition-transform duration-500 ${interactive ? "group-hover:scale-105" : ""}`}
          />
          {interactive && (
            <span aria-hidden className="absolute inset-0 rounded-xl ring-2 ring-primary/0 group-hover:ring-primary/60 transition-all duration-300" />
          )}
        </div>

        {/* Front face */}
        <div
          className={`absolute inset-0 rounded-xl border bg-card [backface-visibility:hidden] [transform:rotateY(180deg)] grid place-items-center p-3 overflow-hidden ${
            picked ? "border-primary" : "border-border/60"
          }`}
        >
          
          <div className="text-center">
            <Icon className="h-9 w-9 mx-auto text-foreground/90" strokeWidth={1.5} />
            <p className="mt-2 text-xs font-semibold leading-tight text-foreground line-clamp-2">{item.name}</p>
            <span className={`mt-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] tracking-wider font-bold ${r.badge}`}>
              {r.label}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

interface FoundUser {
  user_id: string;
  discord_id: string | null;
  username: string | null;
  avatar_url: string | null;
  credits: number;
}

const AdminCreditsSection = () => {
  const [discordId, setDiscordId] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [user, setUser] = useState<FoundUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [granting, setGranting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lookup = async () => {
    const id = discordId.trim();
    if (!id) {
      toast.error("Įvesk Discord ID");
      return;
    }
    setLoading(true);
    setUser(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, discord_id, username, avatar_url, credits")
      .eq("discord_id", id)
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast.error("Klaida ieškant vartotojo");
      return;
    }
    if (!data) {
      toast.error("Vartotojas nerastas");
      return;
    }
    setUser(data as FoundUser);
  };

  const grant = async () => {
    if (!user) return;
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n === 0) {
      toast.error("Įvesk teisingą sumą");
      return;
    }
    setGranting(true);
    const newBalance = (user.credits ?? 0) + n;
    const { error } = await supabase
      .from("profiles")
      .update({ credits: newBalance })
      .eq("user_id", user.user_id);
    setGranting(false);
    setConfirmOpen(false);
    if (error) {
      toast.error("Nepavyko atnaujinti kreditų");
      return;
    }
    toast.success(`Pridėta ${n} kreditų ${user.username ?? user.discord_id}`);
    setUser({ ...user, credits: newBalance });
    setAmount("");
  };

  return (
    <>
      <SectionHeader title="Duoti kreditų" subtitle="Owner įrankis. Suteik kreditus pagal Discord ID." />

      <div className="space-y-4 max-w-xl">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Discord ID</label>
          <div className="flex gap-2">
            <input
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              placeholder="123456789012345678"
              className="flex-1 rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
            <Button onClick={lookup} disabled={loading} className="rounded-md">
              <Search className="h-4 w-4 mr-1.5" />
              {loading ? "Ieškoma…" : "Ieškoti"}
            </Button>
          </div>
        </div>

        {user && (
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-4 flex items-center gap-4">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-secondary grid place-items-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{user.username ?? "—"}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">ID: {user.discord_id}</p>
              <p className="text-xs mt-1 inline-flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold">{user.credits}</span>
                <span className="text-muted-foreground">kreditai</span>
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Kiek kreditų</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Naudok neigiamą skaičių, jei nori atimti.</p>
        </div>

        <Button
          onClick={() => {
            if (!user) { toast.error("Pirma surask vartotoją"); return; }
            const n = parseInt(amount, 10);
            if (!Number.isFinite(n) || n === 0) { toast.error("Įvesk teisingą sumą"); return; }
            setConfirmOpen(true);
          }}
          className="rounded-md bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90"
        >
          <Coins className="h-4 w-4 mr-1.5" />
          Suteikti kreditus
        </Button>
      </div>

      {confirmOpen && user && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={() => !granting && setConfirmOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-secondary/60 grid place-items-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ar tikrai?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Suteikti <span className="text-foreground font-semibold">{amount}</span> kreditų vartotojui{" "}
                  <span className="text-foreground font-semibold">{user.username ?? user.discord_id}</span>?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={granting} className="rounded-md">Atšaukti</Button>
              <Button onClick={grant} disabled={granting} className="rounded-md">
                {granting ? "Suteikiama…" : "Patvirtinti"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayerDashboard;
