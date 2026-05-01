import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Sparkles, Clock, Car, Users, Trophy, Plus, X, Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlayerCharacters } from "@/hooks/usePlayerCharacters";

interface Wheel {
  id: string;
  vehicle_id: string;
  status: "pending" | "spinning" | "finished" | "cancelled";
  starts_at: string;
  ends_at: string;
  spun_at: string | null;
  winner_user_id: string | null;
  winner_discord_id: string | null;
  winner_username: string | null;
  winner_entry_id: string | null;
  winner_character_id: string | null;
  delivery_id: string | null;
  created_at: string;
}

interface Entry {
  id: string;
  wheel_id: string;
  user_id: string;
  discord_id: string;
  username: string | null;
  avatar_url: string | null;
  vip_tier: string | null;
  joined_at: string;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  price: number;
  image_url: string | null;
}

const ENTRY_COLORS = [
  "#e8c25a", "#7ad9e0", "#f97373", "#a78bfa", "#34d399",
  "#fb923c", "#60a5fa", "#f472b6", "#facc15", "#22d3ee",
];

export const LuckyWheelSection = ({
  userId,
  discordId,
  isOwner,
}: {
  userId: string;
  discordId?: string | null;
  isOwner: boolean;
}) => {
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [createOpen, setCreateOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinResolving, setSpinResolving] = useState(false);
  const spinTriggeredRef = useRef<string | null>(null);
  const animatedWheelRef = useRef<string | null>(null);

  // Tick every second for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Active wheel: prefer pending/spinning. Fall back to a recently-finished wheel
  // for ~5 minutes so participants see the result, then it auto-hides.
  const FINISHED_VISIBLE_MS = 20 * 1000;
  const wheelQuery = useQuery({
    queryKey: ["lucky-wheel-active"],
    queryFn: async () => {
      const { data: active } = await supabase
        .from("lucky_wheels")
        .select("*")
        .in("status", ["pending", "spinning"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) return active as Wheel;
      // Fallback: recently finished wheel, only if spun within the visibility window
      const cutoff = new Date(Date.now() - FINISHED_VISIBLE_MS).toISOString();
      const { data: latest } = await supabase
        .from("lucky_wheels")
        .select("*")
        .eq("status", "finished")
        .gt("spun_at", cutoff)
        .order("spun_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (latest ?? null) as Wheel | null;
    },
    refetchInterval: 30000,
  });

  const wheel = wheelQuery.data;

  // Entries for current wheel
  const entriesQuery = useQuery({
    queryKey: ["lucky-wheel-entries", wheel?.id],
    enabled: !!wheel?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("lucky_wheel_entries")
        .select("*")
        .eq("wheel_id", wheel!.id)
        .order("joined_at", { ascending: true });
      return (data ?? []) as Entry[];
    },
  });

  const entries = entriesQuery.data ?? [];
  const entriesSignature = useMemo(() => entries.map((entry) => entry.id).join("|"), [entries]);

  useEffect(() => {
    setSpinning(false);
    setSpinResolving(false);
    setSpinAngle(0);
    animatedWheelRef.current = null;
    spinTriggeredRef.current = null;
  }, [wheel?.id]);

  // Prize vehicle
  const vehicleQuery = useQuery({
    queryKey: ["lucky-wheel-vehicle", wheel?.vehicle_id],
    enabled: !!wheel?.vehicle_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model, price, image_url")
        .eq("id", wheel!.vehicle_id)
        .maybeSingle();
      return data as Vehicle | null;
    },
  });

  const vehicle = vehicleQuery.data;

  // User's active VIP tier (gold/platinum required)
  const myVipQuery = useQuery({
    queryKey: ["my-vip-tier", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_vips")
        .select("expires_at, vip_tiers(tier)")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      // deno-lint-ignore no-explicit-any
      const tier = (data as any)?.vip_tiers?.tier as string | undefined;
      return tier ?? null;
    },
  });

  const myTier = myVipQuery.data;
  const eligible = myTier === "gold" || myTier === "platinum";
  const alreadyJoined = entries.some((e) => e.user_id === userId);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("lucky-wheels-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "lucky_wheels" }, () => {
        qc.invalidateQueries({ queryKey: ["lucky-wheel-active"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lucky_wheel_entries" }, () => {
        qc.invalidateQueries({ queryKey: ["lucky-wheel-entries"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // Auto-spin: when timer expires and wheel is still pending, trigger spin
  const startsAtMs = wheel ? new Date(wheel.starts_at).getTime() : 0;
  const endsAtMs = wheel ? new Date(wheel.ends_at).getTime() : 0;
  const notStartedYet = wheel?.status === "pending" && now < startsAtMs;
  const startsInMs = Math.max(0, startsAtMs - now);
  const remainingMs = Math.max(0, endsAtMs - now);
  const expired = !!wheel && (wheel.status === "pending" || wheel.status === "spinning") && !notStartedYet && remainingMs <= 0;

  useEffect(() => {
    if (!expired || !wheel) return;
    const triggerKey = `${wheel.id}:${wheel.status}`;
    if (spinTriggeredRef.current === triggerKey) return;
    spinTriggeredRef.current = triggerKey;
    setSpinResolving(true);
    (async () => {
      const { data, error } = await supabase.functions.invoke("lucky-wheel-spin", {
        body: { wheel_id: wheel.id },
      });
      if (error) {
        console.error("spin error", error);
        spinTriggeredRef.current = null;
      } else {
        console.log("spin result", data);
      }
      qc.invalidateQueries({ queryKey: ["lucky-wheel-active"] });
    })();
  }, [expired, wheel?.id, wheel?.status, now, qc]);

  // When wheel becomes finished, animate the spin (synced for everyone via spun_at)
  useEffect(() => {
    if (wheel?.status !== "finished" || !wheel.winner_entry_id || entries.length === 0) return;
    setSpinResolving(false);
    const animationKey = `${wheel.id}:${wheel.spun_at ?? "done"}:${wheel.winner_entry_id}:${entriesSignature}`;
    if (animatedWheelRef.current === animationKey) return;
    animatedWheelRef.current = animationKey;
    const winnerIdx = entries.findIndex((e) => e.id === wheel.winner_entry_id);
    if (winnerIdx < 0) return;
    const segment = 360 / entries.length;
    const targetAngle = 360 * 6 - (winnerIdx * segment + segment / 2);

    // If spun more than 6s ago (late joiner), snap to final state without animation
    const spunAgo = wheel.spun_at ? Date.now() - new Date(wheel.spun_at).getTime() : 0;
    if (spunAgo > 6000) {
      setSpinning(false);
      // Snap pointer onto winner instantly
      setSpinAngle(-(winnerIdx * segment + segment / 2));
      return;
    }
    setSpinning(false);
    setSpinAngle(0);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSpinning(true);
        setSpinAngle(targetAngle);
      });
    });
    const remaining = Math.max(200, 5200 - spunAgo);
    const t = setTimeout(() => setSpinning(false), remaining);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [wheel?.id, wheel?.status, wheel?.winner_entry_id, wheel?.spun_at, entriesSignature]);

  // Heartbeat: poll every 5s as a safety net in case realtime drops, so even
  // late or backgrounded clients converge to the server-side finished state.
  useEffect(() => {
    if (!wheel || wheel.status === "finished" || wheel.status === "cancelled") return;
    const i = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["lucky-wheel-active"] });
      qc.invalidateQueries({ queryKey: ["lucky-wheel-entries"] });
    }, 5000);
    return () => clearInterval(i);
  }, [wheel?.id, wheel?.status, qc]);

  const join = async () => {
    if (!wheel) return;
    const { data, error } = await supabase.functions.invoke("lucky-wheel-join", {
      body: { wheel_id: wheel.id },
    });
    // Try to extract a friendly message from non-2xx responses
    let serverMsg: string | undefined = (data as { error?: string } | null)?.error;
    if (error && !serverMsg) {
      try {
        // FunctionsHttpError exposes the original Response on error.context
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.clone().json();
          serverMsg = body?.error;
        }
      } catch { /* ignore */ }
    }
    if (error || serverMsg) {
      toast.error("Nepavyko prisijungti", { description: serverMsg ?? error?.message ?? "Klaida" });
      // Refresh wheel state in case it was cancelled/finished server-side
      qc.invalidateQueries({ queryKey: ["lucky-wheel-active"] });
      return;
    }
    toast.success("Tu dalyvauji! 🎰");
    qc.invalidateQueries({ queryKey: ["lucky-wheel-entries"] });
  };

  const cancelWheel = async () => {
    if (!wheel) return;
    if (!confirm("Tikrai atšaukti šį ratą? Dalyviai negaus prizo.")) return;
    const { error } = await supabase
      .from("lucky_wheels")
      .update({ status: "cancelled" })
      .eq("id", wheel.id);
    if (error) {
      toast.error("Nepavyko atšaukti", { description: error.message });
      return;
    }
    toast.success("Ratas atšauktas");
    qc.invalidateQueries({ queryKey: ["lucky-wheel-active"] });
  };

  const isWinner =
    wheel?.status === "finished" && wheel.winner_user_id === userId && !wheel.delivery_id;

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Sėkmės Ratas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gold ir Platinum VIP nariai gali laimėti automobilį. Vienas dalyvis per ratą.
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setCreateOpen(true)}
            disabled={wheel?.status === "pending" || wheel?.status === "spinning"}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Sukurti ratą
          </button>
        )}
      </div>

      {!wheel ? (
        <div className="rounded-lg border border-border/40 bg-card/50 p-12 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Šiuo metu nėra aktyvaus rato.</p>
          {isOwner && <p className="text-xs text-muted-foreground/70 mt-1">Sukurk naują ratą viršuje.</p>}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Left: prize + wheel */}
          <div className="space-y-5">
            {/* Prize card */}
            <article className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 p-5">
                <div className="w-full sm:w-44 h-32 rounded-md bg-secondary/40 overflow-hidden flex items-center justify-center shrink-0">
                  {vehicle?.image_url ? (
                    <img src={vehicle.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Car className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-primary font-semibold">
                    Prizas
                  </div>
                  <h3 className="text-2xl font-bold mt-1 truncate">
                    {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Kraunama…"}
                  </h3>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" /> {entries.length} dalyvių
                    </span>
                    <StatusBadge status={wheel.status} />
                  </div>
                </div>
                {wheel.status === "pending" && (
                  notStartedYet ? (
                    <Countdown ms={startsInMs} label="Prasidės" />
                  ) : (
                    <Countdown ms={remainingMs} />
                  )
                )}
              </div>
            </article>

            {/* Wheel */}
            <div className="rounded-lg border border-border/40 bg-card/50 p-6 flex flex-col items-center">
              <WheelGraphic
                entries={entries}
                angle={spinAngle}
                spinning={spinning}
                resolving={spinResolving || wheel.status === "spinning"}
                winnerEntryId={wheel.status === "finished" ? wheel.winner_entry_id : null}
              />
              {wheel.status === "finished" && wheel.winner_username && !spinning && (
                <div className="mt-6 text-center animate-fade-in">
                  <Trophy className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Laimėtojas</p>
                  <p className="text-2xl font-bold mt-1">{wheel.winner_username}</p>
                  {isWinner && (
                    <button
                      onClick={() => setClaimOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 h-10 px-5 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition"
                    >
                      <Gift className="h-4 w-4" /> Atsiimti prizą
                    </button>
                  )}
                  {wheel.winner_user_id === userId && wheel.delivery_id && (
                    <p className="mt-4 text-sm text-emerald-400">✓ Prizas atsiimtas</p>
                  )}
                </div>
              )}
              {wheel.status === "cancelled" && (
                <p className="mt-6 text-sm text-muted-foreground">Atšauktas — nebuvo dalyvių.</p>
              )}
            </div>

            {/* Join button area */}
            {wheel.status === "pending" && (
              <div className="rounded-lg border border-border/40 bg-card/50 p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm">
                  {!eligible ? (
                    <p className="text-muted-foreground">
                      Reikalingas <span className="text-primary font-semibold">Gold</span> arba{" "}
                      <span className="text-primary font-semibold">Platinum</span> VIP, kad galėtum dalyvauti.
                    </p>
                  ) : alreadyJoined ? (
                    <p className="text-emerald-400 font-medium">✓ Tu jau dalyvauji{notStartedYet ? " — laukiam pradžios" : ""}</p>
                  ) : notStartedYet ? (
                    <p className="text-foreground">Prisijunk dabar — ratas dar neprasidėjo.</p>
                  ) : (
                    <p className="text-foreground">Pasirengęs išmėginti sėkmę?</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <button
                      onClick={cancelWheel}
                      className="h-10 px-4 rounded-md text-sm font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 transition inline-flex items-center gap-1.5"
                    >
                      <X className="h-4 w-4" /> Atšaukti ratą
                    </button>
                  )}
                  <button
                    onClick={join}
                    disabled={!eligible || alreadyJoined || remainingMs <= 0}
                    className="h-10 px-5 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dalyvauti
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: participants list */}
          <div className="rounded-lg border border-border/40 bg-card/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Dalyviai ({entries.length})</h4>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {entries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Dar nėra dalyvių.</p>
              ) : (
                entries.map((e, i) => {
                  const isWin = wheel.winner_entry_id === e.id && wheel.status === "finished";
                  return (
                    <div
                      key={e.id}
                      className={`flex items-center gap-3 p-2 rounded-md transition ${
                        isWin ? "bg-primary/15 border border-primary/40" : "bg-secondary/30"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: ENTRY_COLORS[i % ENTRY_COLORS.length] }}
                      />
                      {e.avatar_url ? (
                        <img src={e.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.username ?? "Be vardo"}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {e.vip_tier}
                        </p>
                      </div>
                      {isWin && <Trophy className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {isOwner && (
        <CreateWheelDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          userId={userId}
          onCreated={() => qc.invalidateQueries({ queryKey: ["lucky-wheel-active"] })}
        />
      )}

      <ClaimDialog
        open={claimOpen}
        onOpenChange={setClaimOpen}
        wheelId={wheel?.id ?? ""}
        discordId={discordId}
        onClaimed={() => qc.invalidateQueries({ queryKey: ["lucky-wheel-active"] })}
      />
    </>
  );
};

const StatusBadge = ({ status }: { status: Wheel["status"] }) => {
  const map = {
    pending: { label: "Aktyvus", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    spinning: { label: "Sukasi…", cls: "bg-primary/15 text-primary border-primary/30 animate-pulse" },
    finished: { label: "Baigtas", cls: "bg-muted/40 text-muted-foreground border-border" },
    cancelled: { label: "Atšauktas", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  }[status];
  return (
    <span className={`inline-flex items-center text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full font-semibold border ${map.cls}`}>
      {map.label}
    </span>
  );
};

const Countdown = ({ ms, label = "Liko" }: { ms: number; label?: string }) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex flex-col items-end shrink-0">
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> {label}
      </span>
      <span className="font-mono text-2xl font-bold text-primary tabular-nums mt-0.5">
        {d > 0 ? `${d}d ` : ""}{h > 0 || d > 0 ? `${pad(h)}:` : ""}{pad(m)}:{pad(s)}
      </span>
    </div>
  );
};

const WheelGraphic = ({
  entries,
  angle,
  spinning,
  resolving,
  winnerEntryId,
}: {
  entries: Entry[];
  angle: number;
  spinning: boolean;
  resolving: boolean;
  winnerEntryId: string | null;
}) => {
  const size = 360;
  const radius = size / 2;
  const cx = radius;
  const cy = radius;

  // Empty placeholder
  if (entries.length === 0) {
    return (
      <div
        className="rounded-full border-4 border-dashed border-border/50 flex items-center justify-center text-muted-foreground text-sm"
        style={{ width: size, height: size }}
      >
        Laukiama dalyvių…
      </div>
    );
  }

  const segCount = entries.length;
  const segAngle = 360 / segCount;

  // Avatar size scales down as participant count grows
  const avatarSize = Math.max(20, Math.min(44, 320 / Math.max(segCount, 4)));
  const avatarR = radius * 0.68;

  const segments = entries.map((e, i) => {
    const startA = (i * segAngle - 90) * (Math.PI / 180);
    const endA = ((i + 1) * segAngle - 90) * (Math.PI / 180);
    const x1 = cx + radius * Math.cos(startA);
    const y1 = cy + radius * Math.sin(startA);
    const x2 = cx + radius * Math.cos(endA);
    const y2 = cy + radius * Math.sin(endA);
    const largeArc = segAngle > 180 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const midA = ((i + 0.5) * segAngle - 90) * (Math.PI / 180);
    const ax = cx + avatarR * Math.cos(midA);
    const ay = cy + avatarR * Math.sin(midA);
    return {
      id: e.id,
      path,
      color: ENTRY_COLORS[i % ENTRY_COLORS.length],
      avatarUrl: e.avatar_url,
      ax, ay,
      isWinner: e.id === winnerEntryId,
    };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Pointer */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{ top: -6 }}
      >
        <div
          className="w-0 h-0"
          style={{
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "22px solid hsl(var(--primary))",
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
          }}
        />
      </div>

      <svg
        className={resolving && !spinning ? "lucky-wheel-spin-loop" : undefined}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: `rotate(${angle}deg)`,
          transition: spinning ? "transform 5s cubic-bezier(0.17, 0.67, 0.21, 0.99)" : "none",
          filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.4))",
        }}
      >
        <defs>
          <radialGradient id="wheelShade" cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
          </radialGradient>
          {segments.map((s) => (
            <clipPath id={`avatar-clip-${s.id}`} key={`clip-${s.id}`}>
              <circle cx={s.ax} cy={s.ay} r={avatarSize / 2} />
            </clipPath>
          ))}
        </defs>
        {/* Colored wedges */}
        {segments.map((s) => (
          <path
            key={s.id}
            d={s.path}
            fill={s.color}
            stroke="hsl(var(--background))"
            strokeWidth={2}
          />
        ))}
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={radius - 1} fill="none" stroke="hsl(var(--background))" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={radius} fill="url(#wheelShade)" pointerEvents="none" />
        {/* Avatars */}
        {segments.map((s) => (
          <g key={`av-${s.id}`}>
            <circle
              cx={s.ax}
              cy={s.ay}
              r={avatarSize / 2 + 2}
              fill="hsl(var(--background))"
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={1}
            />
            {s.avatarUrl ? (
              <image
                href={s.avatarUrl}
                x={s.ax - avatarSize / 2}
                y={s.ay - avatarSize / 2}
                width={avatarSize}
                height={avatarSize}
                clipPath={`url(#avatar-clip-${s.id})`}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <circle cx={s.ax} cy={s.ay} r={avatarSize / 2} fill="hsl(var(--muted))" />
            )}
          </g>
        ))}
        {/* Center hub */}
        <circle cx={cx} cy={cy} r={32} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={3} />
        <circle cx={cx} cy={cy} r={6} fill="hsl(var(--primary))" />
      </svg>
    </div>
  );
};

const CreateWheelDialog = ({
  open,
  onOpenChange,
  userId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  onCreated: () => void;
}) => {
  const [vehicleId, setVehicleId] = useState("");
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(15);
  const [seconds, setSeconds] = useState(0);
  const [scheduleLater, setScheduleLater] = useState(false);
  const [startAt, setStartAt] = useState(""); // datetime-local string
  const [submitting, setSubmitting] = useState(false);

  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;

  const vehiclesQuery = useQuery({
    queryKey: ["wheel-vehicles"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model, price, image_url")
        .order("brand", { ascending: true });
      return (data ?? []) as Vehicle[];
    },
  });

  const submit = async () => {
    if (!vehicleId) {
      toast.error("Pasirink automobilį");
      return;
    }
    if (totalSeconds < 10 || totalSeconds > 60 * 60 * 24 * 30) {
      toast.error("Trukmė turi būti tarp 10 sek ir 30 dienų.");
      return;
    }
    let startsAtIso = new Date().toISOString();
    if (scheduleLater) {
      if (!startAt) {
        toast.error("Nurodyk pradžios datą / laiką.");
        return;
      }
      const startMs = new Date(startAt).getTime();
      if (Number.isNaN(startMs) || startMs <= Date.now()) {
        toast.error("Pradžios laikas turi būti ateityje.");
        return;
      }
      startsAtIso = new Date(startMs).toISOString();
    }
    const startMs = new Date(startsAtIso).getTime();
    const endsAt = new Date(startMs + totalSeconds * 1000).toISOString();
    setSubmitting(true);
    const { error } = await supabase.from("lucky_wheels").insert({
      vehicle_id: vehicleId,
      starts_at: startsAtIso,
      ends_at: endsAt,
      created_by: userId,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Nepavyko sukurti", { description: error.message });
      return;
    }
    toast.success("Sėkmės ratas sukurtas! 🎰");
    onCreated();
    onOpenChange(false);
    setVehicleId("");
    setDays(0);
    setHours(0);
    setMinutes(15);
    setSeconds(0);
    setScheduleLater(false);
    setStartAt("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Sukurti Sėkmės Ratą
          </DialogTitle>
          <DialogDescription>
            Pasirink prizą, trukmę ir (nebūtinai) pradžios laiką.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Automobilis (prizas)</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Pasirink automobilį…" /></SelectTrigger>
              <SelectContent>
                {(vehiclesQuery.data ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.brand} {v.model} — {v.price} €
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Trukmė</Label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Input type="number" min={0} max={30} value={days}
                  onChange={(e) => setDays(Math.max(0, parseInt(e.target.value) || 0))} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 text-center">Dienos</p>
              </div>
              <div>
                <Input type="number" min={0} max={23} value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 text-center">Valandos</p>
              </div>
              <div>
                <Input type="number" min={0} max={59} value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 text-center">Minutės</p>
              </div>
              <div>
                <Input type="number" min={0} max={59} value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 text-center">Sekundės</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Iš viso: <span className="text-foreground font-medium">{totalSeconds} sek</span>. Kai laikas baigsis, ratas automatiškai išrinks laimėtoją.
            </p>
          </div>
          <div className="space-y-2 rounded-md border border-border/40 bg-secondary/20 p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleLater}
                onChange={(e) => setScheduleLater(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium">Pradėti vėliau (suplanuoti)</span>
            </label>
            {scheduleLater && (
              <div className="space-y-1">
                <Input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ratas bus matomas, bet dalyvavimas atsivers nuo nurodyto laiko.
                </p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-md text-sm font-medium border border-border bg-secondary/40 hover:bg-secondary/70 transition"
          >
            Atšaukti
          </button>
          <button
            onClick={submit}
            disabled={submitting || !vehicleId}
            className="h-9 px-4 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? "Kuriama…" : "Sukurti"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ClaimDialog = ({
  open,
  onOpenChange,
  wheelId,
  discordId,
  onClaimed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  wheelId: string;
  discordId?: string | null;
  onClaimed: () => void;
}) => {
  const { characters, loading } = usePlayerCharacters(discordId);
  const [characterId, setCharacterId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && characters.length > 0 && !characterId) {
      setCharacterId(characters[0].id);
    }
  }, [open, characters, characterId]);

  const submit = async () => {
    if (!characterId) {
      toast.error("Pasirink personažą");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("lucky-wheel-claim", {
      body: { wheel_id: wheelId, character_id: characterId },
    });
    setSubmitting(false);
    if (error || (data as { error?: string })?.error) {
      const msg = (data as { error?: string } | null)?.error ?? error?.message ?? "Klaida";
      toast.error("Nepavyko atsiimti", { description: msg });
      return;
    }
    toast.success("🎉 Prizas atsiųstas į garažą!");
    onClaimed();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Atsiimti prizą
          </DialogTitle>
          <DialogDescription>
            Pasirink, kuriam personažui bus atiduotas automobilis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Kraunama…</p>
          ) : characters.length === 0 ? (
            <p className="text-sm text-destructive">Neturi personažų.</p>
          ) : (
            <div className="space-y-2">
              <Label>Personažas</Label>
              <Select value={characterId} onValueChange={setCharacterId}>
                <SelectTrigger><SelectValue placeholder="Pasirink personažą…" /></SelectTrigger>
                <SelectContent>
                  {characters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.identifier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-md text-sm font-medium border border-border bg-secondary/40 hover:bg-secondary/70 transition"
          >
            Vėliau
          </button>
          <button
            onClick={submit}
            disabled={submitting || !characterId || characters.length === 0}
            className="h-9 px-4 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? "Siunčiama…" : "Atsiimti"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
