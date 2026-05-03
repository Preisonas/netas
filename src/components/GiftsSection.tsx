import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeFn } from "@/lib/invokeFn";
import { usePlayerCharacters } from "@/hooks/usePlayerCharacters";
import { Gift, Car, Check, Briefcase, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";

type GiftDelivery = {
  id: string;
  type: string;
  item_name: string;
  label: string;
  plate: string | null;
  status: string;
  created_at: string;
  character_id: string | null;
  claimed_at: string | null;
  gifter_user_id: string | null;
};

const formatMoney = (n: number | null | undefined) =>
  new Intl.NumberFormat("lt-LT").format(n ?? 0) + " €";

const initials = (c: { firstName?: string | null; lastName?: string | null }) =>
  `${(c.firstName ?? "").charAt(0)}${(c.lastName ?? "").charAt(0)}`.toUpperCase() || "?";

export default function GiftsSection({
  userId,
  discordId,
}: {
  userId: string;
  discordId: string | null | undefined;
}) {
  const qc = useQueryClient();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [selectedCharByGift, setSelectedCharByGift] = useState<Record<string, string>>({});

  const { characters, loading: charsLoading } = usePlayerCharacters(discordId);

  const giftsQuery = useQuery({
    queryKey: ["pending-gifts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_deliveries")
        .select("id, type, item_name, label, plate, status, created_at, character_id, claimed_at, gifter_user_id")
        .eq("recipient_user_id", userId)
        .eq("is_gift", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GiftDelivery[];
    },
    refetchInterval: 10_000,
  });

  const gifts = giftsQuery.data ?? [];

  const claim = async (giftId: string) => {
    const charId = selectedCharByGift[giftId];
    if (!charId) {
      toast.error("Pasirink personažą");
      return;
    }
    setClaimingId(giftId);
    const { error } = await invokeFn("claim-gift", {
      body: { delivery_id: giftId, character_id: charId },
    });
    setClaimingId(null);
    if (error) {
      toast.error("Nepavyko atsiimti", { description: error });
      return;
    }
    toast.success("🎁 Dovana atsiimta! Pristatymas paleistas.");
    qc.invalidateQueries({ queryKey: ["pending-gifts", userId] });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Dovanos</p>
        <h2 className="text-2xl font-bold mt-1 flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          Tavo dovanos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Čia matysi visas tau padovanotas dovanas. Pasirink personažą, kuriam jas priskirti.
        </p>
      </div>

      {giftsQuery.isLoading ? (
        <div className="rounded-lg bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          Kraunama...
        </div>
      ) : gifts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 bg-card/30 p-10 text-center">
          <Gift className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium">Dovanų kol kas nėra</p>
          <p className="text-xs text-muted-foreground mt-1">
            Kai kažkas tau padovanos transportą — atsiras čia.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {gifts.map((g) => {
            const selectedChar = selectedCharByGift[g.id];
            const isClaiming = claimingId === g.id;
            return (
              <div
                key={g.id}
                className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-xl p-5 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 h-12 w-12 rounded-lg bg-[image:var(--gradient-brand)] grid place-items-center">
                    <Car className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{g.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {g.plate ? `Numeris: ${g.plate}` : "Be numerio"} · Gauta{" "}
                      {new Date(g.created_at).toLocaleDateString("lt-LT")}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-primary/15 text-primary">
                    Dovana
                  </span>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Kam atiduoti
                  </p>
                  {charsLoading ? (
                    <div className="rounded-lg bg-secondary/20 p-4 text-center text-sm text-muted-foreground">
                      Kraunama...
                    </div>
                  ) : characters.length === 0 ? (
                    <div className="rounded-lg bg-secondary/20 p-4 text-center text-sm text-muted-foreground">
                      Veikėjų nėra. Prisijunk prie serverio bent kartą.
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {characters.map((c) => {
                        const active = selectedChar === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              setSelectedCharByGift((s) => ({ ...s, [g.id]: c.id }))
                            }
                            className={`group relative text-left rounded-lg p-3 transition-all duration-200 ${
                              active
                                ? "bg-secondary/80 ring-1 ring-primary/40"
                                : "bg-secondary/30 hover:bg-secondary/60"
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
                </div>

                <button
                  type="button"
                  disabled={!selectedChar || isClaiming}
                  onClick={() => claim(g.id)}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Atsiimama...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4" /> Atsiimti dovaną
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
