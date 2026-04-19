import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

const charactersKey = (discordId?: string | null) => ["characters", discordId ?? "none"] as const;

async function fetchCharacters(discordId: string): Promise<PlayerCharacter[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("id, identifier, first_name, last_name, job, cash, bank, metadata, playtime_minutes, last_synced_at")
    .eq("discord_id", discordId)
    .order("last_synced_at", { ascending: false });
  if (error || !data) return [];
  return data.map((c) => {
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
  });
}

export function usePlayerCharacters(discordId?: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: charactersKey(discordId),
    queryFn: () => fetchCharacters(discordId as string),
    enabled: !!discordId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!discordId) return;
    const channel = supabase
      .channel(`chars-${discordId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "characters", filter: `discord_id=eq.${discordId}` },
        () => qc.invalidateQueries({ queryKey: charactersKey(discordId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [discordId, qc]);

  return { characters: query.data ?? [], loading: query.isLoading };
}

// Random LT-style plate: 3 letters + 3 digits, e.g. "MKK 123"
export function generatePlate(): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const digits = "0123456789";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  return `${pick(letters)}${pick(letters)}${pick(letters)}${pick(digits)}${pick(digits)}${pick(digits)}`;
}
