import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerCharacter {
  id: string;
  identifier: string;
  firstName: string;
  lastName: string;
  job: string;
  cash: number;
  bank: number;
  playtimeMinutes: number;
}

export function usePlayerCharacters(discordId?: string | null) {
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!discordId) {
      setCharacters([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("characters")
        .select("id, identifier, first_name, last_name, job, cash, bank, metadata, playtime_minutes, last_synced_at")
        .eq("discord_id", discordId)
        .order("last_synced_at", { ascending: false });
      if (cancelled) return;
      if (!error && data) {
        setCharacters(
          data.map((c) => {
            const md = (c.metadata as { job_label?: string | null } | null) ?? null;
            return {
              id: c.id,
              identifier: c.identifier,
              firstName: c.first_name ?? "",
              lastName: c.last_name ?? "",
              job: md?.job_label || c.job || "—",
              cash: c.cash ?? 0,
              bank: c.bank ?? 0,
              playtimeMinutes: c.playtime_minutes ?? 0,
            };
          })
        );
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`chars-hook-${discordId}-${Math.random().toString(36).slice(2, 8)}`)
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

  return { characters, loading };
}

// Random LT-style plate: 3 letters + 3 digits, e.g. "MKK 123"
export function generatePlate(): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const digits = "0123456789";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  return `${pick(letters)}${pick(letters)}${pick(letters)}${pick(digits)}${pick(digits)}${pick(digits)}`;
}
