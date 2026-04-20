import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, Tag, X, Edit3, Power } from "lucide-react";
import { toast } from "sonner";

interface DiscountCode {
  id: string;
  code: string;
  discount_percent: number;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  active: boolean;
}

const empty: DiscountCode = {
  id: "", code: "", discount_percent: 10, expires_at: null, max_uses: null, uses: 0, active: true,
};

// Convert ISO -> value usable by <input type="datetime-local">
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

const DiscountCodesManager = () => {
  const [list, setList] = useState<DiscountCode[]>([]);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Nepavyko įkelti"); return; }
    setList(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const remove = async (c: DiscountCode) => {
    if (!confirm(`Ištrinti kodą ${c.code}?`)) return;
    const { error } = await supabase.from("discount_codes").delete().eq("id", c.id);
    if (error) { toast.error("Klaida"); return; }
    toast.success("Ištrinta");
    load();
  };

  const toggleActive = async (c: DiscountCode) => {
    const { error } = await supabase.from("discount_codes").update({ active: !c.active }).eq("id", c.id);
    if (error) { toast.error("Klaida"); return; }
    load();
  };

  const save = async () => {
    if (!editing) return;
    const code = editing.code.trim().toUpperCase();
    if (!code) { toast.error("Įvesk kodą"); return; }
    if (editing.discount_percent < 1 || editing.discount_percent > 100) {
      toast.error("Nuolaida turi būti 1–100%"); return;
    }
    setSaving(true);
    const payload = {
      code,
      discount_percent: editing.discount_percent,
      expires_at: editing.expires_at,
      max_uses: editing.max_uses,
      active: editing.active,
    };
    const { error } = editing.id
      ? await supabase.from("discount_codes").update(payload).eq("id", editing.id)
      : await supabase.from("discount_codes").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message.includes("unique") ? "Toks kodas jau yra" : "Nepavyko išsaugoti"); return; }
    toast.success("Išsaugota");
    setEditing(null);
    load();
  };

  if (editing) {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{editing.id ? "Redaguoti kodą" : "Naujas kodas"}</h3>
          <Button variant="outline" onClick={() => setEditing(null)} className="rounded-md gap-2">
            <X className="h-4 w-4" /> Atšaukti
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Kodas</label>
            <input
              value={editing.code}
              onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
              placeholder="PVZ. SUMMER25"
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60 font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Nuolaida (%)</label>
            <input
              type="number" min={1} max={100}
              value={editing.discount_percent}
              onChange={(e) => setEditing({ ...editing, discount_percent: parseInt(e.target.value || "0", 10) })}
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Maks. panaudojimų (neprivaloma)</label>
            <input
              type="number" min={1}
              value={editing.max_uses ?? ""}
              onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? parseInt(e.target.value, 10) : null })}
              placeholder="∞"
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Galioja iki (neprivaloma)</label>
            <input
              type="datetime-local"
              value={toLocal(editing.expires_at)}
              onChange={(e) => setEditing({ ...editing, expires_at: fromLocal(e.target.value) })}
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Palik tuščią — nesibaigia.</p>
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="active" type="checkbox"
              checked={editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="active" className="text-sm">Aktyvus</label>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="rounded-md gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saugoma…" : "Išsaugoti"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{list.length} kodų</p>
        <Button onClick={() => setEditing({ ...empty })} className="rounded-md gap-2">
          <Plus className="h-4 w-4" /> Naujas kodas
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Kraunama…</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg bg-secondary/30 p-10 text-center">
          <Tag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Dar nėra nuolaidos kodų.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((c) => {
            const expired = c.expires_at && new Date(c.expires_at) < new Date();
            const used = c.max_uses != null && c.uses >= c.max_uses;
            const status = !c.active ? "Išjungtas" : expired ? "Pasibaigęs" : used ? "Išnaudotas" : "Aktyvus";
            const statusColor = !c.active || expired || used ? "text-destructive" : "text-primary";
            return (
              <div key={c.id} className="rounded-lg bg-secondary/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono font-bold tracking-wider">{c.code}</p>
                  <span className={`text-[11px] uppercase ${statusColor}`}>{status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  -{c.discount_percent}% • Naudota {c.uses}{c.max_uses != null ? ` / ${c.max_uses}` : ""}
                </p>
                {c.expires_at && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Galioja iki {new Date(c.expires_at).toLocaleString()}
                  </p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => setEditing(c)} className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 inline-flex items-center gap-1">
                    <Edit3 className="h-3 w-3" /> Redaguoti
                  </button>
                  <button onClick={() => toggleActive(c)} className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 inline-flex items-center gap-1">
                    <Power className="h-3 w-3" /> {c.active ? "Išjungti" : "Įjungti"}
                  </button>
                  <button onClick={() => remove(c)} className="text-xs px-2 py-1 rounded bg-secondary hover:bg-destructive/20 hover:text-destructive inline-flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Trinti
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiscountCodesManager;
