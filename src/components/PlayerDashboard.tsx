import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const OWNER_DISCORD_IDS = ["1276583745490649214", "528409152024870922", "811365896824029184"];
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
import DiscountCodesManager from "@/components/admin/DiscountCodesManager";
import { usePlayerCharacters, generatePlate, type PlayerCharacter } from "@/hooks/usePlayerCharacters";
import { CreditCheckoutDialog } from "@/components/CreditCheckoutDialog";

interface PlayerDashboardProps {
  session: Session;
  onClose: () => void;
  initialSection?: SectionKey;
}

type SectionKey =
  | "profile"
  | "shop"
  | "vip"
  | "boxes"
  | "credits"
  | "admin-credits"
  | "admin-cases"
  | "admin-vehicles"
  | "admin-discounts";

type NavGroup = { label: string; items: { key: SectionKey; title: string; icon: typeof User; badge?: string }[] };

const baseNavGroups: NavGroup[] = [
  {
    label: "Valdymas",
    items: [
      { key: "profile", title: "Profilis", icon: User },
      { key: "shop", title: "Parduotuvė", icon: ShoppingBag },
      { key: "vip", title: "VIP", icon: Crown },
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
    { key: "admin-discounts", title: "Nuolaidos kodai", icon: Tag },
  ],
};

const PlayerDashboard = ({ session, onClose, initialSection = "profile" }: PlayerDashboardProps) => {
  const [active, setActive] = useState<SectionKey>(initialSection);
  const qc = useQueryClient();

  const meta = session.user.user_metadata as
    | { username?: string; full_name?: string; avatar_url?: string; discord_id?: string }
    | undefined;

  const profileQuery = useQuery({
    queryKey: ["profile", session.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url, discord_id, email, credits")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const profile = profileQuery.data;

  useEffect(() => {
    const channel = supabase
      .channel(`profile-changes-${session.user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          const next = (payload.new ?? null) as typeof profile | null;
          if (next) {
            qc.setQueryData(["profile", session.user.id], (old: typeof profile) => ({
              ...(old ?? ({} as never)),
              ...next,
            }));
          } else {
            qc.invalidateQueries({ queryKey: ["profile", session.user.id] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.user.id, qc]);

  const username = profile?.username ?? meta?.username ?? meta?.full_name ?? session.user.email ?? "Žaidėjas";
  const avatarUrl = profile?.avatar_url ?? meta?.avatar_url;
  const discordId = profile?.discord_id ?? meta?.discord_id;
  const credits = profile?.credits ?? 0;
  const isOwner = !!discordId && OWNER_DISCORD_IDS.includes(discordId);
  const navGroups = isOwner ? [...baseNavGroups, ownerNavGroup] : baseNavGroups;

  const { characters: sidebarCharacters } = usePlayerCharacters(discordId);
  const characterCount = sidebarCharacters.length;

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
                  {characterCount > 0
                    ? `${characterCount} veikėj${characterCount === 1 ? "as" : "ai"}`
                    : "Neturite sukurtų veikėjų"}
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
            <ProfileSection
              username={username}
              avatarUrl={avatarUrl}
              discordId={discordId}
              email={session.user.email ?? ""}
            />
          )}
          {active === "shop" && <ShopSection discordId={discordId} userId={session.user.id} />}
          {active === "vip" && <VipSection userId={session.user.id} discordId={discordId} />}
          {active === "credits" && <CreditsSection />}
          {active === "boxes" && <BoxesSection discordId={discordId} userId={session.user.id} />}
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
          {active === "admin-discounts" && isOwner && (
            <>
              <SectionHeader title="Nuolaidos kodai" subtitle="Kurk ir valdyk nuolaidų kodus su galiojimo laiku." />
              <DiscountCodesManager />
            </>
          )}
          {active !== "profile" &&
            active !== "shop" &&
            active !== "vip" &&
            active !== "credits" &&
            active !== "boxes" &&
            active !== "admin-credits" &&
            active !== "admin-cases" &&
            active !== "admin-vehicles" &&
            active !== "admin-discounts" && <Placeholder title={titleFor(active)} />}
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

// Shared character-picker modal: server-authoritative purchase via edge function.
// Server validates price, deducts credits, and creates the delivery row atomically.
const DeliveryPicker = ({
  open,
  onClose,
  itemLabel,
  type,
  sourceId,
  basePrice,
  discordId,
  userId,
  onDelivered,
}: {
  open: boolean;
  onClose: () => void;
  itemLabel: string;
  type: "vehicle" | "case_item";
  sourceId: string; // vehicle_id or case_id
  basePrice?: number;
  discordId?: string | null;
  userId: string;
  onDelivered?: () => void;
}) => {
  const { characters, loading } = usePlayerCharacters(discordId);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [useCustomPlate, setUseCustomPlate] = useState(false);
  const [customPlate, setCustomPlate] = useState("");
  const [fullTune, setFullTune] = useState(false);
  const qc = useQueryClient();

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setSelectedCharId(null);
      setUseCustomPlate(false);
      setCustomPlate("");
      setFullTune(false);
    }
  }, [open]);

  // Auto-select first character once loaded
  useEffect(() => {
    if (open && !selectedCharId && characters.length > 0) {
      setSelectedCharId(characters[0].id);
    }
  }, [open, characters, selectedCharId]);

  if (!open) return null;

  const isVehicle = type === "vehicle";
  const PLATE_COST = 5;
  const TUNE_COST = 10;
  const extras = (isVehicle && useCustomPlate ? PLATE_COST : 0) + (isVehicle && fullTune ? TUNE_COST : 0);
  const total = (basePrice ?? 0) + extras;
  const plateClean = customPlate.trim().toUpperCase();
  const plateValid = !useCustomPlate || /^[A-Z0-9 ]{2,8}$/.test(plateClean);
  const selectedChar = characters.find((c) => c.id === selectedCharId) ?? null;
  const canConfirm = !!selectedChar && plateValid && !submitting;

  const deliver = async () => {
    if (!discordId || !selectedChar) return;
    if (isVehicle && useCustomPlate && !plateValid) {
      toast.error("Neteisingas numeris", { description: "2-8 simboliai: A-Z, 0-9, tarpai." });
      return;
    }
    setSubmitting(true);
    const payload: Record<string, unknown> = { type, character_id: selectedChar.id };
    if (isVehicle) {
      payload.vehicle_id = sourceId;
      if (useCustomPlate) payload.custom_plate = plateClean;
      if (fullTune) payload.full_tune = true;
    } else {
      payload.case_id = sourceId;
    }

    const { data, error } = await supabase.functions.invoke("process-purchase", { body: payload });
    setSubmitting(false);

    if (error || (data && (data as { error?: string }).error)) {
      const rawMsg = (data as { error?: string } | null)?.error ?? error?.message ?? "Nepavyko apdoroti pirkimo";
      const isPlateTaken = /plate\s+already\s+taken/i.test(rawMsg);
      if (isPlateTaken) {
        toast.error("Numeris jau užimtas", {
          description: `Numeris „${plateClean}" jau priklauso kitam transportui. Pasirink kitą.`,
        });
      } else {
        toast.error("Pirkimas nepavyko", { description: rawMsg });
      }
      return;
    }

    const result = data as { label?: string; plate?: string | null; credits_remaining?: number };
    if (typeof result.credits_remaining === "number") {
      qc.setQueryData(["profile", userId], (old: { credits?: number } | null | undefined) =>
        old ? { ...old, credits: result.credits_remaining } : old,
      );
    }
    qc.invalidateQueries({ queryKey: ["profile", userId] });
    toast.success(
      `${result.label ?? itemLabel} išsiųstas: ${selectedChar.firstName} ${selectedChar.lastName}`,
      result.plate
        ? { description: `Numeris: ${result.plate} • Liko ${result.credits_remaining ?? 0} €` }
        : { description: `Liko ${result.credits_remaining ?? 0} €` },
    );
    onDelivered?.();
    onClose();
  };

  const initials = (c: PlayerCharacter) =>
    `${(c.firstName ?? "?")[0] ?? "?"}${(c.lastName ?? "")[0] ?? ""}`.toUpperCase();
  const platePreview = plateClean || "ABC 123";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-background/90 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-card shadow-[0_20px_80px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              {isVehicle ? "Transporto pirkimas" : "Dėžės pristatymas"}
            </p>
            <h3 className="text-2xl font-bold leading-tight truncate">{itemLabel}</h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
          {/* Character selection */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Veikėjas</p>
            {loading ? (
              <div className="rounded-lg bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
                Kraunama...
              </div>
            ) : characters.length === 0 ? (
              <div className="rounded-lg bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
                Veikėjų nėra. Prisijunk prie serverio.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {characters.map((c) => {
                  const active = selectedCharId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCharId(c.id)}
                      className={`group relative text-left rounded-lg p-3 transition-all duration-200 ${
                        active ? "bg-secondary/80" : "bg-secondary/30 hover:bg-secondary/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`shrink-0 h-10 w-10 rounded-full grid place-items-center text-sm font-bold ${
                            active
                              ? "bg-[image:var(--gradient-brand)] text-primary-foreground"
                              : "bg-secondary/60 text-muted-foreground"
                          }`}
                        >
                          {initials(c)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">
                            {c.firstName || "—"} {c.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate inline-flex items-center gap-1.5">
                            <Briefcase className="h-3 w-3" />
                            {c.job}
                          </p>
                        </div>
                        {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Wallet className="h-3 w-3 text-primary" />
                          {formatMoney(c.bank)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Vehicle extras */}
          {isVehicle && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Papildomos paslaugos</p>
              <div className="space-y-2">
                {/* Full tune */}

                {/* Custom plate */}
                <div className={`rounded-lg transition-all ${useCustomPlate ? "bg-secondary/80" : "bg-secondary/30"}`}>
                  <button
                    type="button"
                    onClick={() => setUseCustomPlate((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 p-3.5"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <Tag
                        className={`h-5 w-5 shrink-0 ${useCustomPlate ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <div>
                        <p className="text-sm font-semibold">Pasirinktinis numeris</p>
                        <p className="text-xs text-muted-foreground">2-8 simboliai: A-Z, 0-9, tarpai</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-primary">+{PLATE_COST} €</span>
                      <SwitchPill on={useCustomPlate} />
                    </div>
                  </button>

                  {useCustomPlate && (
                    <div className="px-3.5 pb-3.5 -mt-1 flex items-center gap-3">
                      <input
                        type="text"
                        value={customPlate}
                        onChange={(e) => setCustomPlate(e.target.value.toUpperCase().slice(0, 8))}
                        placeholder="ABC 123"
                        maxLength={8}
                        className={`flex-1 font-mono uppercase tracking-[0.2em] text-sm bg-background/60 rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition ${
                          customPlate && !plateValid ? "ring-1 ring-destructive" : ""
                        }`}
                      />
                      <div className="shrink-0 w-32 h-11 rounded-md bg-foreground grid place-items-center font-mono font-bold text-base tracking-[0.15em] text-background shadow-inner">
                        {platePreview}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!plateValid && customPlate && (
                <p className="mt-2 text-xs text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Neteisingas formatas
                </p>
              )}
            </section>
          )}
        </div>

        {/* Sticky footer */}
        <div className="bg-secondary/40 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Iš viso</p>
            {basePrice !== undefined ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">{total} €</span>
                </span>
                {extras > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {basePrice} + {extras}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pristatymas</p>
            )}
          </div>
          <button
            onClick={deliver}
            disabled={!canConfirm}
            className="h-11 px-6 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {submitting ? (
              "Apdorojama..."
            ) : (
              <>
                <Check className="h-4 w-4" />
                Patvirtinti
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const SwitchPill = ({ on }: { on: boolean }) => (
  <span
    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${on ? "bg-primary" : "bg-secondary"}`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform ${
        on ? "translate-x-[22px] bg-primary-foreground" : "translate-x-0.5"
      }`}
    />
  </span>
);

const ProfileSection = ({
  username,
  avatarUrl,
  discordId,
  email,
}: {
  username: string;
  avatarUrl?: string | null;
  discordId?: string | null;
  email: string;
}) => {
  const { characters, loading } = usePlayerCharacters(discordId);

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

const formatMoney = (n: number) => new Intl.NumberFormat("lt-LT").format(n) + " $";

const formatPlaytime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const CharacterCard = ({ character: c }: { character: PlayerCharacter }) => (
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
  images: string[];
  videoUrl?: string;
  features: string[];
}

function getYoutubeId(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const ShopSection = ({ discordId, userId }: { discordId?: string | null; userId: string }) => {
  const { characters: ownedCharacters } = usePlayerCharacters(discordId);
  const [query, setQuery] = useState("");
  const [sortByPrice, setSortByPrice] = useState(false);
  const [vehicles, setVehicles] = useState<ShopVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, price, top_speed, trunk, image_url, images, features, video_url")
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
              images: (v as { images?: string[] }).images ?? [],
              videoUrl: v.video_url ?? undefined,
              features: v.features ?? [],
            })),
          );
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
            sortByPrice
              ? "bg-background text-foreground"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground"
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
          filtered.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              discordId={discordId}
              userId={userId}
              ownedCharacters={ownedCharacters}
            />
          ))
        )}
      </div>
    </>
  );
};

const VehicleCard = ({
  vehicle: v,
  discordId,
  userId,
  ownedCharacters,
}: {
  vehicle: ShopVehicle;
  discordId?: string | null;
  userId: string;
  ownedCharacters: PlayerCharacter[];
}) => {
  const [playing, setPlaying] = useState(false);
  const ytId = getYoutubeId(v.videoUrl);
  const gallery = [v.image, ...(v.images ?? [])].filter((x): x is string => Boolean(x));
  const [imgIdx, setImgIdx] = useState(0);
  const currentImg = gallery[imgIdx];
  return (
    <article className="group relative rounded-xl overflow-hidden bg-secondary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-background/60">
        {playing && ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
            title={`${v.brand} ${v.model}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <>
            {currentImg ? (
              <img
                src={currentImg}
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
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent"
            />
            {ytId && (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label="Paleisti video"
                className="absolute inset-0 grid place-items-center bg-background/20 hover:bg-background/10 transition-colors"
              >
                <span className="grid place-items-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 ml-0.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </button>
            )}
            {gallery.length > 1 && !ytId && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-background/60 backdrop-blur-sm">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                    aria-label={`Nuotrauka ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-5 bg-primary" : "w-1.5 bg-foreground/40 hover:bg-foreground/70"}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
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
            <Gauge className="h-3.5 w-3.5" />~ {v.speed} km/h
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

        <BuyWithCharacter
          itemLabel={`${v.brand} ${v.model}`}
          vehicleId={v.id}
          price={v.price}
          discordId={discordId}
          userId={userId}
          ownedCharacters={ownedCharacters}
        />
      </div>
    </article>
  );
};

const BuyWithCharacter = ({
  itemLabel,
  vehicleId,
  price,
  discordId,
  userId,
  ownedCharacters,
}: {
  itemLabel: string;
  vehicleId: string;
  price: number;
  discordId?: string | null;
  userId: string;
  ownedCharacters: PlayerCharacter[];
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          if (!discordId) {
            toast.error("Prisijunk per Discord");
            return;
          }
          if (ownedCharacters.length === 0) {
            toast.error("Neturite veikėjų. Prisijunk prie serverio.");
            return;
          }
          setOpen(true);
        }}
        className="mt-4 w-full h-9 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition"
      >
        Pirkti
      </button>
      <DeliveryPicker
        open={open}
        onClose={() => setOpen(false)}
        itemLabel={itemLabel}
        sourceId={vehicleId}
        basePrice={price}
        type="vehicle"
        discordId={discordId}
        userId={userId}
      />
    </>
  );
};

// =====================================================================
// VIP Section
// =====================================================================

interface VipTier {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  color: string;
  perks: string[];
  sort_order: number;
}

interface UserVipRow {
  id: string;
  tier_id: string;
  expires_at: string;
}

const VipSection = ({ userId, discordId }: { userId: string; discordId?: string | null }) => {
  const qc = useQueryClient();

  const tiersQuery = useQuery({
    queryKey: ["vip-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vip_tiers")
        .select("id, tier, name, description, price, duration_days, color, perks, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as VipTier[];
    },
  });

  const myVipsQuery = useQuery({
    queryKey: ["user-vips", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_vips")
        .select("id, tier_id, expires_at")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as UserVipRow[];
    },
    refetchInterval: 10_000,
  });

  const [buyingId, setBuyingId] = useState<string | null>(null);

  const buy = async (tier: VipTier) => {
    if (!discordId) {
      toast.error("Prisijunk per Discord");
      return;
    }
    setBuyingId(tier.id);
    const { data, error } = await supabase.functions.invoke("process-purchase", {
      body: { type: "vip", vip_tier_id: tier.id },
    });
    setBuyingId(null);
    if (error || (data && (data as { error?: string }).error)) {
      const msg = (data as { error?: string } | null)?.error ?? error?.message ?? "Pirkimas nepavyko";
      toast.error("Nepavyko nupirkti VIP", { description: msg });
      return;
    }
    const result = data as { credits_remaining?: number; expires_at?: string };
    if (typeof result.credits_remaining === "number") {
      qc.setQueryData(["profile", userId], (old: { credits?: number } | null | undefined) =>
        old ? { ...old, credits: result.credits_remaining } : old,
      );
    }
    qc.invalidateQueries({ queryKey: ["user-vips", userId] });
    qc.invalidateQueries({ queryKey: ["profile", userId] });
    toast.success(`${tier.name} aktyvuotas!`, {
      description: result.expires_at
        ? `Galioja iki ${new Date(result.expires_at).toLocaleString("lt-LT")}`
        : undefined,
    });
  };

  const myVips = myVipsQuery.data ?? [];
  const myVipByTier = new Map(myVips.map((v) => [v.tier_id, v]));

   const tierIcons: Record<string, typeof Crown> = {
     silver: Shield,
     gold: Sparkles,
     platinum: Crown,
   };

   // Tier accent themes — single accent hue per tier, used sparingly for a clean look
   const tierTheme: Record<string, { accent: string; soft: string; glow: string; letter: string }> = {
     silver:   { accent: "#c9d1da", soft: "rgba(201,209,218,0.10)", glow: "rgba(201,209,218,0.25)", letter: "S" },
     gold:     { accent: "#e8c25a", soft: "rgba(232,194,90,0.10)",  glow: "rgba(232,194,90,0.30)",  letter: "G" },
     platinum: { accent: "#7ad9e0", soft: "rgba(122,217,224,0.10)", glow: "rgba(122,217,224,0.30)", letter: "P" },
   };

  return (
    <>
      <SectionHeader
        title="VIP Narystės"
        subtitle="Įsigyk VIP statusą ir gauk papildomų privalumų serveryje."
      />

      {tiersQuery.isLoading ? (
        <p className="text-center text-muted-foreground py-12">Kraunama…</p>
      ) : (tiersQuery.data ?? []).length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nėra prieinamų VIP lygių.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {(tiersQuery.data ?? []).map((tier) => {
            const Icon = tierIcons[tier.tier] ?? Crown;
            const myVip = myVipByTier.get(tier.id);
            const active = myVip && new Date(myVip.expires_at).getTime() > Date.now();
            const expiresLabel = active
              ? new Date(myVip!.expires_at).toLocaleDateString("lt-LT")
              : null;
            const isFeatured = tier.tier === "platinum";

            const theme = tierTheme[tier.tier] ?? tierTheme.silver;

            return (
              <article
                key={tier.id}
                className={`group relative flex flex-col rounded-2xl overflow-hidden border bg-card/80 transition-colors duration-200 ${
                  active ? "border-primary/50" : "border-border/60 hover:border-border"
                }`}
                style={{
                  boxShadow: active
                    ? `0 24px 70px -25px hsl(var(--primary) / 0.45)`
                    : `0 20px 60px -30px ${theme.glow}`,
                }}
              >
                {/* Subtle corner glow */}
                <div
                  aria-hidden
                  className="absolute -top-24 -right-24 w-56 h-56 rounded-full pointer-events-none opacity-60"
                  style={{ background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)` }}
                />

                {/* Logo watermark */}
                <img
                  src="/logo.png"
                  alt=""
                  aria-hidden
                  className="pointer-events-none select-none absolute -bottom-8 -right-8 w-44 h-44 object-contain opacity-[0.05]"
                />

                {/* Header */}
                <div className="relative px-6 pt-6 pb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        Membership
                      </span>
                      <span
                        className="text-[11px] uppercase tracking-[0.3em] font-semibold"
                        style={{ color: theme.accent }}
                      >
                        {tier.tier}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-baseline justify-between gap-2">
                    <h3 className="text-xl font-bold leading-tight">{tier.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black tracking-tight" style={{ color: theme.accent }}>
                        {tier.price}
                      </span>
                      <span className="text-xs text-muted-foreground">€/{tier.duration_days}d</span>
                    </div>
                  </div>

                  {tier.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                  )}

                  <div className="mt-4 flex items-center gap-2 min-h-[24px]">
                    {isFeatured && !active && (
                      <span
                        className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full font-semibold"
                        style={{ background: theme.soft, color: theme.accent, border: `1px solid ${theme.accent}33` }}
                      >
                        Populiariausias
                      </span>
                    )}
                    {active && (
                      <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full font-semibold bg-primary/15 text-primary border border-primary/30">
                        Aktyvus
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="relative flex flex-col flex-1 px-6 pt-5 pb-6">
                  <ul className="space-y-2.5 flex-1">
                    {tier.perks.map((perk, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: theme.accent }} />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <button
                      onClick={() => buy(tier)}
                      disabled={buyingId === tier.id}
                      className="w-full h-10 rounded-md text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed border hover:brightness-125"
                      style={{
                        background: `linear-gradient(180deg, ${theme.accent}22, ${theme.accent}10)`,
                        borderColor: `${theme.accent}55`,
                        color: theme.accent,
                      }}
                    >
                      {buyingId === tier.id
                        ? "Apdorojama…"
                        : active
                        ? `Pratęsti (+${tier.duration_days} d.)`
                        : "Pirkti"}
                    </button>

                    {active && expiresLabel ? (
                      <p className="mt-3 text-center text-xs text-muted-foreground">
                        Galioja iki <span className="text-foreground font-medium">{expiresLabel}</span>
                      </p>
                    ) : (
                      <p className="mt-3 text-center text-xs text-muted-foreground/60">&nbsp;</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
};

const CreditsSection = () => {
  const [amount, setAmount] = useState(10);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const qc = useQueryClient();
  const presets = [5, 10, 25, 50, 100, 250];

  const subtotal = amount;
  const discountValue = +(subtotal * discount).toFixed(2);
  const total = +(subtotal - discountValue).toFixed(2);

  const applyCode = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { data, error } = await supabase
      .from("discount_codes")
      .select("code, discount_percent, expires_at, max_uses, uses, active")
      .eq("code", c)
      .maybeSingle();
    if (error || !data) {
      setDiscount(0);
      setAppliedCode(null);
      toast.error("Nuolaidos kodas neegzistuoja");
      return;
    }
    if (!data.active) {
      setDiscount(0);
      setAppliedCode(null);
      toast.error("Kodas išjungtas");
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setDiscount(0);
      setAppliedCode(null);
      toast.error("Kodas pasibaigęs");
      return;
    }
    if (data.max_uses != null && data.uses >= data.max_uses) {
      setDiscount(0);
      setAppliedCode(null);
      toast.error("Kodas išnaudotas");
      return;
    }
    const pct = data.discount_percent / 100;
    setDiscount(pct);
    setAppliedCode(data.code);
    toast.success(`Pritaikyta nuolaida -${data.discount_percent}%`);
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
                placeholder="pvz. SUMMER25"
                className="flex-1 h-10 px-3 rounded-md bg-background/60 border border-border/60 text-sm outline-none focus:border-primary/60 transition placeholder:text-muted-foreground"
              />
              <button
                onClick={applyCode}
                className="h-10 px-4 rounded-md text-sm font-semibold bg-secondary hover:bg-secondary/80 transition"
              >
                Pritaikyti
              </button>
            </div>
            {discount > 0 && <p className="text-xs text-primary mt-2">Nuolaida -{discount * 100}% pritaikyta.</p>}
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
            onClick={() => {
              if (amount < 1) {
                toast.error("Mažiausia suma — 1 €");
                return;
              }
              setCheckoutOpen(true);
            }}
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

      <CreditCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        credits={amount}
        discountCode={appliedCode ?? undefined}
        onSuccess={() => {
          toast.success("Apmokėta! Kreditai bus pridėti per kelias sekundes.");
          setTimeout(() => qc.invalidateQueries({ queryKey: ["profile"] }), 1500);
        }}
      />
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
  common: {
    text: "text-muted-foreground",
    ring: "ring-border/60",
    label: "DAŽNAS",
    bar: "bg-muted-foreground/50",
    badge: "bg-muted-foreground/15 text-muted-foreground border border-muted-foreground/20",
  },
  rare: {
    text: "text-[hsl(210_80%_70%)]",
    ring: "ring-[hsl(210_80%_55%)]/40",
    label: "RETAS",
    bar: "bg-[hsl(210_80%_55%)]",
    badge: "bg-[hsl(210_80%_55%)]/15 text-[hsl(210_80%_75%)] border border-[hsl(210_80%_55%)]/30",
  },
  epic: {
    text: "text-[hsl(265_75%_72%)]",
    ring: "ring-[hsl(265_75%_60%)]/45",
    label: "EPINIS",
    bar: "bg-[hsl(265_75%_60%)]",
    badge: "bg-[hsl(265_75%_60%)]/15 text-[hsl(265_75%_75%)] border border-[hsl(265_75%_60%)]/30",
  },
  legendary: {
    text: "text-[hsl(38_95%_65%)]",
    ring: "ring-[hsl(38_95%_55%)]/45",
    label: "LEGENDINIS",
    bar: "bg-[hsl(38_95%_55%)]",
    badge: "bg-[hsl(38_95%_55%)]/15 text-[hsl(38_95%_70%)] border border-[hsl(38_95%_55%)]/30",
  },
  mythic: {
    text: "text-primary",
    ring: "ring-primary/50",
    label: "MITINIS",
    bar: "bg-primary",
    badge: "bg-primary/15 text-primary border border-primary/30",
  },
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

const BoxesSection = ({ discordId, userId }: { discordId?: string | null; userId: string }) => {
  const [openingBox, setOpeningBox] = useState<LootBox | null>(null);
  const [boxes, setBoxes] = useState<LootBox[]>([]);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();
  const profile = qc.getQueryData<{ credits?: number } | null>(["profile", userId]);
  const credits = profile?.credits ?? 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [casesRes, itemsRes] = await Promise.all([
        supabase.from("cases").select("id, name, image_url, price").order("created_at", { ascending: false }),
        supabase.from("case_items").select("id, case_id, label, item_name, chance"),
      ]);
      if (cancelled) return;
      const cases = casesRes.data;
      const items = itemsRes.data;
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
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
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
            <BoxCard
              key={box.id}
              box={box}
              onOpen={() => {
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
              }}
            />
          ))}
        </div>
      )}

      {openingBox && (
        <CaseOpeningModal box={openingBox} onClose={() => setOpeningBox(null)} discordId={discordId} userId={userId} />
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

        <button onClick={onOpen} className="mt-auto pt-5 w-full">
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

const CaseOpeningModal = ({
  box,
  onClose,
  discordId,
  userId,
}: {
  box: LootBox;
  onClose: () => void;
  discordId?: string | null;
  userId: string;
}) => {
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
              <p className="text-sm text-muted-foreground">
                Paspausk „Atidaryti", kad atskleistum {CARD_COUNT} korteles.
              </p>
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
                <span
                  className={`inline-flex items-center mt-2 px-2 py-0.5 rounded text-[10px] tracking-wider font-bold ${rarityStyles[winner.rarity].badge}`}
                >
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

        {winner && (
          <DeliveryPicker
            open={selectingChar}
            onClose={() => setSelectingChar(false)}
            itemLabel={box.name}
            sourceId={box.id}
            type="case_item"
            discordId={discordId}
            userId={userId}
            onDelivered={() => {
              reset();
              onClose();
            }}
          />
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
            <span
              aria-hidden
              className="absolute inset-0 rounded-xl ring-2 ring-primary/0 group-hover:ring-primary/60 transition-all duration-300"
            />
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
            <span
              className={`mt-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] tracking-wider font-bold ${r.badge}`}
            >
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
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ credits: newBalance })
      .eq("user_id", user.user_id)
      .select("user_id, credits");
    setGranting(false);
    setConfirmOpen(false);
    if (error) {
      toast.error("Nepavyko atnaujinti kreditų", { description: error.message });
      return;
    }
    if (!updated || updated.length === 0) {
      toast.error("Atnaujinimas užblokuotas (RLS) — nė viena eilutė nepakeista");
      return;
    }
    toast.success(`Pridėta ${n} kreditų ${user.username ?? user.discord_id}`);
    setUser({ ...user, credits: updated[0].credits });
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
            if (!user) {
              toast.error("Pirma surask vartotoją");
              return;
            }
            const n = parseInt(amount, 10);
            if (!Number.isFinite(n) || n === 0) {
              toast.error("Įvesk teisingą sumą");
              return;
            }
            setConfirmOpen(true);
          }}
          className="rounded-md bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90"
        >
          <Coins className="h-4 w-4 mr-1.5" />
          Suteikti kreditus
        </Button>
      </div>

      {confirmOpen && user && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => !granting && setConfirmOpen(false)}
        >
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
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={granting}
                className="rounded-md"
              >
                Atšaukti
              </Button>
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
