import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeFn } from "@/lib/invokeFn";
import { toast } from "sonner";
import { Trophy, Gift, Car, CheckCircle2, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlayerCharacters } from "@/hooks/usePlayerCharacters";

interface WonWheel {
  id: string;
  spun_at: string | null;
  delivery_id: string | null;
  vehicle_id: string;
  vehicles: { brand: string; model: string; image_url: string | null } | null;
}

export const useUnclaimedWinsCount = (userId: string) => {
  return useQuery({
    queryKey: ["vip-inventory-unclaimed", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("lucky_wheels")
        .select("id", { count: "exact", head: true })
        .eq("winner_user_id", userId)
        .eq("status", "finished")
        .is("delivery_id", null);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });
};

export const VipInventorySection = ({
  userId,
  discordId,
}: {
  userId: string;
  discordId?: string | null;
}) => {
  const qc = useQueryClient();
  const [claimWheelId, setClaimWheelId] = useState<string | null>(null);
  const notifiedRef = useState<Set<string>>(new Set())[0];

  const winsQuery = useQuery({
    queryKey: ["vip-inventory-wins", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lucky_wheels")
        .select("id, spun_at, delivery_id, vehicle_id, vehicles(brand, model, image_url)")
        .eq("winner_user_id", userId)
        .eq("status", "finished")
        .order("spun_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WonWheel[];
    },
  });

  const wins = winsQuery.data ?? [];
  const unclaimed = wins.filter((w) => !w.delivery_id);

  // One-time toast notification on entry if there are unclaimed prizes
  useEffect(() => {
    if (unclaimed.length === 0) return;
    const key = `vip-inventory-notified-${userId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    toast.success(
      `🎉 Turi ${unclaimed.length} neatsiimtą prizą${unclaimed.length === 1 ? "" : "s"}!`,
      { description: "Atidaryk Inventorių, kad atsiimtum savo laimėjimą." },
    );
  }, [unclaimed.length, userId]);

  // Realtime: when delivery_id changes, refresh
  useEffect(() => {
    const ch = supabase
      .channel(`vip-inventory-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lucky_wheels", filter: `winner_user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["vip-inventory-wins", userId] });
          qc.invalidateQueries({ queryKey: ["vip-inventory-unclaimed", userId] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" /> Mano Inventorius
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visi tavo Sėkmės Rato laimėjimai. Neatsiimtus prizus gali atsiimti bet kada.
        </p>
      </div>

      {winsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground py-12 text-center">Kraunama…</p>
      ) : wins.length === 0 ? (
        <div className="rounded-lg border border-border/40 bg-card/50 p-12 text-center">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Dar neturi laimėjimų.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Dalyvauk Sėkmės Rate, kad laimėtum automobilį.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {unclaimed.length > 0 && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 flex items-center gap-3">
              <Gift className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm">
                Turi <span className="font-bold text-primary">{unclaimed.length}</span>{" "}
                neatsiimtą prizą — atsiimk juos žemiau.
              </p>
            </div>
          )}
          {wins.map((w) => {
            const veh = w.vehicles;
            const claimed = !!w.delivery_id;
            return (
              <article
                key={w.id}
                className={`rounded-lg border p-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center transition ${
                  claimed
                    ? "border-border/40 bg-card/50"
                    : "border-primary/40 bg-gradient-to-br from-primary/10 to-transparent"
                }`}
              >
                <div className="w-full sm:w-32 h-24 rounded-md bg-secondary/40 overflow-hidden flex items-center justify-center shrink-0">
                  {veh?.image_url ? (
                    <img src={veh.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Car className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-primary font-semibold inline-flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> Laimėjimas
                  </div>
                  <h3 className="text-lg font-bold mt-0.5 truncate">
                    {veh ? `${veh.brand} ${veh.model}` : "Automobilis"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {w.spun_at ? new Date(w.spun_at).toLocaleString("lt-LT") : "—"}
                  </p>
                </div>
                <div className="shrink-0">
                  {claimed ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Atsiimta
                    </span>
                  ) : (
                    <button
                      onClick={() => setClaimWheelId(w.id)}
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-md text-sm font-semibold bg-[image:var(--gradient-brand)] text-primary-foreground hover:opacity-90 transition"
                    >
                      <Gift className="h-4 w-4" /> Atsiimti
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ClaimDialog
        open={!!claimWheelId}
        onOpenChange={(o) => !o && setClaimWheelId(null)}
        wheelId={claimWheelId ?? ""}
        discordId={discordId}
        onClaimed={() => {
          qc.invalidateQueries({ queryKey: ["vip-inventory-wins", userId] });
          qc.invalidateQueries({ queryKey: ["vip-inventory-unclaimed", userId] });
        }}
      />
    </>
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
    if (!characterId || !wheelId) return;
    setSubmitting(true);
    const { error } = await invokeFn("lucky-wheel-claim", {
      body: { wheel_id: wheelId, character_id: characterId },
    });
    setSubmitting(false);
    if (error) {
      toast.error("Nepavyko atsiimti", { description: error });
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
