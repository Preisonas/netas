import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, Package, Coins, X, Edit3 } from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "./ImageUploader";

interface Case {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
}

interface CaseItem {
  id?: string;
  label: string;
  item_name: string;
  chance: number;
}

const CasesManager = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [editing, setEditing] = useState<Case | null>(null);
  const [items, setItems] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cases").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Nepavyko įkelti"); return; }
    setCases(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const startNew = () => {
    setEditing({ id: "", name: "", image_url: null, price: 0 });
    setItems([]);
  };

  const startEdit = async (c: Case) => {
    setEditing(c);
    const { data } = await supabase.from("case_items").select("id, label, item_name, chance").eq("case_id", c.id);
    setItems(data ?? []);
  };

  const remove = async (c: Case) => {
    if (!confirm(`Ištrinti dėžę "${c.name}"?`)) return;
    const { error } = await supabase.from("cases").delete().eq("id", c.id);
    if (error) { toast.error("Klaida"); return; }
    toast.success("Ištrinta");
    load();
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Įvesk pavadinimą"); return; }
    setSaving(true);
    let caseId = editing.id;
    if (!caseId) {
      const { data, error } = await supabase
        .from("cases")
        .insert({ name: editing.name, image_url: editing.image_url, price: editing.price })
        .select("id").single();
      if (error || !data) { setSaving(false); toast.error("Nepavyko sukurti"); return; }
      caseId = data.id;
    } else {
      const { error } = await supabase
        .from("cases")
        .update({ name: editing.name, image_url: editing.image_url, price: editing.price })
        .eq("id", caseId);
      if (error) { setSaving(false); toast.error("Nepavyko išsaugoti"); return; }
    }

    // Replace items: delete all then insert
    await supabase.from("case_items").delete().eq("case_id", caseId);
    if (items.length > 0) {
      const valid = items.filter((i) => i.label.trim() && i.item_name.trim());
      if (valid.length > 0) {
        const { error } = await supabase.from("case_items").insert(
          valid.map((i) => ({ case_id: caseId, label: i.label, item_name: i.item_name, chance: i.chance }))
        );
        if (error) { setSaving(false); toast.error("Daiktai neišsaugoti"); return; }
      }
    }
    setSaving(false);
    toast.success("Išsaugota");
    setEditing(null);
    load();
  };

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{editing.id ? "Redaguoti dėžę" : "Nauja dėžė"}</h3>
          <Button variant="outline" onClick={() => setEditing(null)} className="rounded-md gap-2">
            <X className="h-4 w-4" /> Atšaukti
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Pavadinimas</label>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="VIP dėžė"
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Kaina (€)</label>
            <input
              type="number"
              value={editing.price}
              onChange={(e) => setEditing({ ...editing, price: parseInt(e.target.value || "0", 10) })}
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Paveikslėlis</label>
          <ImageUploader value={editing.image_url} onChange={(u) => setEditing({ ...editing, image_url: u })} folder="cases" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Daiktai dėžėje</h4>
            <Button
              size="sm"
              onClick={() => setItems([...items, { label: "", item_name: "", chance: 0 }])}
              className="rounded-md gap-1.5"
            >
              <Plus className="h-4 w-4" /> Pridėti daiktą
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Šansai – % (pvz. 25 = 25%). Bendra suma neturi viršyti 100.
          </p>

          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={it.label}
                  onChange={(e) => {
                    const next = [...items]; next[i] = { ...it, label: e.target.value }; setItems(next);
                  }}
                  placeholder="Pistol"
                  className="col-span-4 rounded-md bg-secondary/60 border border-border/60 px-2.5 py-2 text-sm outline-none focus:border-primary/60"
                />
                <input
                  value={it.item_name}
                  onChange={(e) => {
                    const next = [...items]; next[i] = { ...it, item_name: e.target.value }; setItems(next);
                  }}
                  placeholder="weapon_pistol"
                  className="col-span-5 rounded-md bg-secondary/60 border border-border/60 px-2.5 py-2 text-sm font-mono outline-none focus:border-primary/60"
                />
                <div className="col-span-2 relative">
                  <input
                    type="number"
                    step="0.1"
                    value={it.chance}
                    onChange={(e) => {
                      const next = [...items]; next[i] = { ...it, chance: parseFloat(e.target.value || "0") }; setItems(next);
                    }}
                    placeholder="25"
                    className="w-full rounded-md bg-secondary/60 border border-border/60 pl-2.5 pr-6 py-2 text-sm outline-none focus:border-primary/60"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <button
                  onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                  className="col-span-1 h-9 rounded-md bg-secondary/60 hover:bg-destructive/20 hover:text-destructive grid place-items-center"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Daiktų nėra. Pridėk bent vieną.</p>
            )}
          </div>

          {items.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Bendra šansų suma:{" "}
              <span className={`font-semibold ${items.reduce((s, i) => s + i.chance, 0) > 100 ? "text-destructive" : "text-foreground"}`}>
                {items.reduce((s, i) => s + i.chance, 0).toFixed(1)}%
              </span>
            </p>
          )}
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
        <p className="text-sm text-muted-foreground">{cases.length} dėžės</p>
        <Button onClick={startNew} className="rounded-md gap-2">
          <Plus className="h-4 w-4" /> Nauja dėžė
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Kraunama…</p>
      ) : cases.length === 0 ? (
        <div className="rounded-lg bg-secondary/30 p-10 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Dar nėra dėžių. Sukurk pirmą.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {cases.map((c) => (
            <div key={c.id} className="rounded-lg bg-secondary/30 p-4 flex gap-3">
              {c.image_url ? (
                <img src={c.image_url} alt="" className="h-16 w-20 rounded object-cover" />
              ) : (
                <div className="h-16 w-20 rounded bg-secondary grid place-items-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.name}</p>
                <p className="text-xs inline-flex items-center gap-1 text-primary">
                  <Coins className="h-3 w-3" />
                  {c.price} €
                </p>
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => startEdit(c)} className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 inline-flex items-center gap-1">
                    <Edit3 className="h-3 w-3" /> Redaguoti
                  </button>
                  <button onClick={() => remove(c)} className="text-xs px-2 py-1 rounded bg-secondary hover:bg-destructive/20 hover:text-destructive inline-flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Trinti
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CasesManager;
