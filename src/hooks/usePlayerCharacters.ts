import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface CharacterVehicle {
  plate: string;
  model?: string | number | null;
  label?: string | null;
  stored?: string | null; // garage name or "out"
  garage?: string | null;
  state?: number | null; // 0 out, 1 garage, 2 impound
  owner?: string | null;
}

export interface CharacterJob {
  name: string;
  label?: string | null;
  grade?: number | null;
  grade_label?: string | null;
}

export interface CharacterLicense {
  type: string; // e.g. "drive", "weapon"
  label?: string | null;
}

export interface PlayerCharacter {
  id: string;
  identifier: string;
  firstName: string;
  lastName: string;
  job: string;
  jobGradeLabel?: string | null;
  cash: number;
  bank: number;
  blackMoney: number;
  playtimeMinutes: number;
  // metadata-derived
  dob?: string | null;
  sex?: string | null;
  phoneNumber?: string | null;
  personalCode?: string | null;
  registeredAt?: string | null;
  lastSeen?: string | null;
  health?: number | null;
  armor?: number | null;
  hunger?: number | null;
  thirst?: number | null;
  jailMinutes?: number | null;
  driverLicenses: string[]; // e.g. ["B kategorija"]
  licenses: CharacterLicense[];
  jobs: CharacterJob[]; // all jobs the character has
  vehicles: CharacterVehicle[];
  online?: boolean | null;
  credits?: number | null;
  vip?: { active: boolean; tier: "silver" | "gold" | "platinum" | null; expires_at?: string | null } | null;
}

const charactersKey = (discordId?: string | null) => ["characters", discordId ?? "none"] as const;

type Md = {
  job_label?: string | null;
  job_grade_label?: string | null;
  dob?: string | null;
  sex?: string | null;
  phone_number?: string | null;
  personal_code?: string | null;
  registered_at?: string | null;
  last_seen?: string | null;
  health?: number | null;
  armor?: number | null;
  hunger?: number | null;
  thirst?: number | null;
  jail_minutes?: number | null;
  driver_licenses?: string[] | null;
  licenses?: Array<{ type: string; label?: string | null }> | null;
  jobs?: Array<{ name: string; label?: string | null; grade?: number | null; grade_label?: string | null }> | null;
  vehicles?: Array<CharacterVehicle> | null;
  online?: boolean | null;
  credits?: number | null;
} | null;

async function fetchCharacters(discordId: string): Promise<PlayerCharacter[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("id, identifier, first_name, last_name, job, job_grade, cash, bank, black_money, metadata, playtime_minutes, last_synced_at")
    .eq("discord_id", discordId)
    .order("last_synced_at", { ascending: false });
  if (error || !data) return [];
  return data.map((c) => {
    const md = (c.metadata as Md) ?? null;
    return {
      id: c.id,
      identifier: c.identifier,
      firstName: c.first_name ?? "",
      lastName: c.last_name ?? "",
      job: md?.job_label || c.job || "—",
      jobGradeLabel: md?.job_grade_label ?? (c.job_grade != null ? String(c.job_grade) : null),
      cash: c.cash ?? 0,
      bank: c.bank ?? 0,
      blackMoney: c.black_money ?? 0,
      playtimeMinutes: c.playtime_minutes ?? 0,
      dob: md?.dob ?? null,
      sex: md?.sex ?? null,
      phoneNumber: md?.phone_number ?? null,
      personalCode: md?.personal_code ?? null,
      registeredAt: md?.registered_at ?? null,
      lastSeen: md?.last_seen ?? null,
      health: md?.health ?? null,
      armor: md?.armor ?? null,
      hunger: md?.hunger ?? null,
      thirst: md?.thirst ?? null,
      jailMinutes: md?.jail_minutes ?? null,
      driverLicenses: md?.driver_licenses ?? [],
      licenses: md?.licenses ?? [],
      jobs: md?.jobs ?? [],
      vehicles: md?.vehicles ?? [],
      online: md?.online ?? null,
      credits: md?.credits ?? null,
    };
  });
}

export function usePlayerCharacters(discordId?: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: charactersKey(discordId),
    queryFn: () => fetchCharacters(discordId as string),
    enabled: !!discordId,
    staleTime: 5_000,
    gcTime: 5 * 60_000,
    refetchInterval: 15_000, // polling fallback in case realtime drops
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!discordId) return;
    const channel: RealtimeChannel = supabase
      .channel(`chars-${discordId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "characters", filter: `discord_id=eq.${discordId}` },
        () => {
          qc.invalidateQueries({ queryKey: charactersKey(discordId) });
          qc.refetchQueries({ queryKey: charactersKey(discordId) });
        },
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
