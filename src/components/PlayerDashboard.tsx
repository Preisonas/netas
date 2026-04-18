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
  Gavel,
  Ticket,
  Trophy,
  UserPlus,
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
} from "lucide-react";
import { toast } from "sonner";
import shopMclaren from "@/assets/shop-mclaren.png";

interface PlayerDashboardProps {
  session: Session;
  onClose: () => void;
}

type SectionKey =
  | "profile"
  | "shop"
  | "boxes"
  | "auction"
  | "lottery"
  | "leaderboard"
  | "invites"
  | "credits";

const navGroups: { label: string; items: { key: SectionKey; title: string; icon: typeof User; badge?: string }[] }[] = [
  {
    label: "Valdymas",
    items: [
      { key: "profile", title: "Profilis", icon: User },
      { key: "shop", title: "Parduotuvė", icon: ShoppingBag },
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
          {active !== "profile" && active !== "shop" && active !== "credits" && <Placeholder title={titleFor(active)} />}
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

interface Character {
  id: string;
  firstName: string;
  lastName: string;
  money: number;
  bank: number;
  job: string;
  playtimeMinutes: number;
}

const mockCharacters: Character[] = [
  {
    id: "1",
    firstName: "Jonas",
    lastName: "Jonaitis",
    money: 12500,
    bank: 87400,
    job: "Policininkas",
    playtimeMinutes: 742,
  },
];

const ProfileSection = ({
  username,
  avatarUrl,
  discordId,
  email,
}: { username: string; avatarUrl?: string | null; discordId?: string | null; email: string }) => (
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
      <span className="text-xs text-muted-foreground">{mockCharacters.length} / 3</span>
    </div>

    {mockCharacters.length === 0 ? (
      <div className="rounded-xl bg-secondary/30 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Veikėjų dar nėra. Kai prisijungsi prie serverio, jie atsiras čia automatiškai.
        </p>
      </div>
    ) : (
      <div className="grid sm:grid-cols-2 gap-4">
        {mockCharacters.map((c) => (
          <CharacterCard key={c.id} character={c} />
        ))}
      </div>
    )}
  </>
);

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

type Tier = "gold" | "silver" | "bronze";
type Category = "Visi" | "Transportas" | "Paslaugos" | "Daiktai" | "Ratai" | "Kita";

interface ShopVehicle {
  id: number;
  brand: string;
  model: string;
  price: number;
  grid: number;
  speed: number;
  trunk?: number;
  tier: Tier;
  category: Exclude<Category, "Visi">;
  image?: string;
  features: string[];
}

const shopVehicles: ShopVehicle[] = [
  { id: 1, brand: "McLaren", model: "Senna", price: 220, grid: 30, speed: 340, trunk: 145, tier: "gold", category: "Transportas", image: shopMclaren,
    features: ["Dirt map", "Ray Tracing Ready", "Custom airbrush", "4 sėdimos vietos"] },
  { id: 2, brand: "BMW", model: "M5 F10", price: 140, grid: 20, speed: 310, tier: "gold", category: "Transportas",
    features: ["Dirt map", "Ray Tracing Ready", "Vossen HF 5 Ratai", "Veikiantis spidometras", "4 sėdimos vietos"] },
  { id: 3, brand: "BMW", model: "M4 CSL", price: 180, grid: 25, speed: 320, tier: "gold", category: "Transportas",
    features: ["Dirt map", "Ray Tracing Ready", "Vossen HF 5 Ratai", "Veikiantis custom spidometras", "4 sėdimos vietos"] },
  { id: 4, brand: "BMW", model: "M3 G81", price: 160, grid: 20, speed: 320, tier: "silver", category: "Transportas",
    features: ["Dirt map", "Ray Tracing Ready", "Forgiato Flow 002 Ratai", "Veikiantis custom spidometras", "4 sėdimos vietos"] },
  { id: 5, brand: "Pagani", model: "Huayra", price: 140, grid: 0, speed: 310, trunk: 248, tier: "silver", category: "Transportas",
    features: ["Greitas pagreitėjimas", "Lengva valdyti"] },
  { id: 6, brand: "Audi", model: "RS6 Avant", price: 170, grid: 22, speed: 305, tier: "bronze", category: "Transportas",
    features: ["Dirt map", "Ray Tracing Ready", "Universalas", "5 sėdimos vietos"] },
];

const tierStyles: Record<Tier, { text: string; label: string }> = {
  gold:   { text: "text-[hsl(330_90%_65%)]", label: "gold" },
  silver: { text: "text-[hsl(160_75%_55%)]", label: "silver" },
  bronze: { text: "text-[hsl(30_90%_60%)]",  label: "bronze" },
};

const categories: Category[] = ["Visi", "Transportas", "Paslaugos", "Daiktai", "Ratai", "Kita"];

const ShopSection = () => {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category>("Visi");
  const [sortByPrice, setSortByPrice] = useState(false);

  const filtered = useMemo(() => {
    let list = shopVehicles.filter((v) => {
      const matchesCat = cat === "Visi" || v.category === cat;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || `${v.brand} ${v.model}`.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
    if (sortByPrice) list = [...list].sort((a, b) => a.price - b.price);
    return list;
  }, [query, cat, sortByPrice]);

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

        <div className="flex items-center gap-1 rounded-md bg-secondary/40 border border-border/60 p-1 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 px-3 h-7 rounded text-xs font-medium transition-colors ${
                cat === c ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => setSortByPrice((s) => !s)}
            className={`shrink-0 ml-1 px-3 h-7 rounded text-xs font-medium transition-colors border-l border-border/60 ${
              sortByPrice ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Kaina
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((v) => (
          <VehicleCard key={v.id} vehicle={v} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">Nieko nerasta.</p>
        )}
      </div>
    </>
  );
};

const VehicleCard = ({ vehicle: v }: { vehicle: ShopVehicle }) => {
  const tier = tierStyles[v.tier];
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
          {v.grid > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/60 text-muted-foreground">
              Grid: <span className="text-foreground font-medium">{v.grid}€</span>
            </span>
          )}
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
    const codes: Record<string, number> = { WELCOME10: 0.1, VIP20: 0.2, TEST50: 0.5 };
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
                placeholder="pvz. WELCOME10"
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

export default PlayerDashboard;
