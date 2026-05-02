import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, Car, Coins, X, Edit3, Gauge, Briefcase, Plane } from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "./ImageUploader";

type VehicleCategory = "car" | "helicopter";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  model_name: string;
  image_url: string | null;
  images: string[];
  price: number;
  top_speed: number;
  trunk: number | null;
  features: string[];
  video_url: string | null;
  category: VehicleCategory;
}

const empty: Vehicle = {
  id: "", brand: "", model: "", model_name: "", image_url: null, images: [], price: 0, top_speed: 0, trunk: null, features: [], video_url: null, category: "car",
};

const MAX_FEATURES = 10;
const MAX_IMAGES = 10;

const VehiclesManager = () => {
  const [list, setList] = useState<Vehicle[]>([]);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [featInput, setFeatInput] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Nepavyko įkelti"); return; }
    setList((data ?? []).map((v) => ({ ...v, category: (v.category === "helicopter" ? "helicopter" : "car") as VehicleCategory })) as Vehicle[]);
  };

  useEffect(() => { load(); }, []);

  const remove = async (v: Vehicle) => {
    if (!confirm(`Ištrinti ${v.brand} ${v.model}?`)) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
    if (error) { toast.error("Klaida"); return; }
    toast.success("Ištrinta");
    load();
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.brand.trim() || !editing.model.trim()) { toast.error("Įvesk markę ir modelį"); return; }
    setSaving(true);
    const payload = {
      brand: editing.brand,
      model: editing.model,
      model_name: editing.model_name,
      image_url: editing.image_url,
      images: editing.images,
      price: editing.price,
      top_speed: editing.top_speed,
      trunk: editing.trunk,
      features: editing.features,
      video_url: editing.video_url,
      category: editing.category,
    };
    const { error } = editing.id
      ? await supabase.from("vehicles").update(payload).eq("id", editing.id)
      : await supabase.from("vehicles").insert(payload);
    setSaving(false);
    if (error) { toast.error("Nepavyko išsaugoti"); return; }
    toast.success("Išsaugota");
    setEditing(null);
    load();
  };

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{editing.id ? "Redaguoti transportą" : "Naujas transportas"}</h3>
          <Button variant="outline" onClick={() => setEditing(null)} className="rounded-md gap-2">
            <X className="h-4 w-4" /> Atšaukti
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Markė</label>
            <input
              value={editing.brand}
              onChange={(e) => setEditing({ ...editing, brand: e.target.value })}
              placeholder="BMW"
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Modelis</label>
            <input
              value={editing.model}
              onChange={(e) => setEditing({ ...editing, model: e.target.value })}
              placeholder="M5 F10"
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Modelio pavadinimas žaidime (spawn name)</label>
            <input
              value={editing.model_name}
              onChange={(e) => setEditing({ ...editing, model_name: e.target.value })}
              placeholder="pvz. adder, t20, sultan"
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60 font-mono"
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
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Maks. greitis (km/h)</label>
            <input
              type="number"
              value={editing.top_speed}
              onChange={(e) => setEditing({ ...editing, top_speed: parseInt(e.target.value || "0", 10) })}
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Bagažinė (kg, neprivaloma)</label>
            <input
              type="number"
              value={editing.trunk ?? ""}
              onChange={(e) => setEditing({ ...editing, trunk: e.target.value ? parseInt(e.target.value, 10) : null })}
              className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">Pagrindinis paveikslėlis</label>
          <ImageUploader value={editing.image_url} onChange={(u) => setEditing({ ...editing, image_url: u })} folder="vehicles" />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">
            Papildomos nuotraukos ({editing.images.length}/{MAX_IMAGES})
          </label>
          <div className="flex flex-wrap gap-3">
            {editing.images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img} alt="" className="h-24 w-32 object-cover rounded-md border border-border/60" />
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, images: editing.images.filter((_, idx) => idx !== i) })}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-card border border-border grid place-items-center hover:bg-destructive/20 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {editing.images.length < MAX_IMAGES && (
              <ImageUploader
                value={null}
                onChange={(u) => {
                  if (u) setEditing({ ...editing, images: [...editing.images, u] });
                }}
                folder="vehicles"
              />
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Iki {MAX_IMAGES} papildomų nuotraukų galerijai.</p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">YouTube video nuoroda (neprivaloma)</label>
          <input
            value={editing.video_url ?? ""}
            onChange={(e) => setEditing({ ...editing, video_url: e.target.value || null })}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Kortelėje bus rodomas video vietoj paveikslėlio (kai užvedi pelę / paspaudi).</p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground/70 mb-1.5">
            Modelio informacija ({editing.features.length}/{MAX_FEATURES})
          </label>
          <div className="flex gap-2 mb-2">
            <input
              value={featInput}
              onChange={(e) => setFeatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && featInput.trim() && editing.features.length < MAX_FEATURES) {
                  e.preventDefault();
                  setEditing({ ...editing, features: [...editing.features, featInput.trim()] });
                  setFeatInput("");
                }
              }}
              placeholder="pvz. Dirt map"
              disabled={editing.features.length >= MAX_FEATURES}
              className="flex-1 rounded-md bg-secondary/60 border border-border/60 px-3 py-2 text-sm outline-none focus:border-primary/60 disabled:opacity-50"
            />
            <Button
              type="button"
              disabled={editing.features.length >= MAX_FEATURES}
              onClick={() => {
                if (!featInput.trim() || editing.features.length >= MAX_FEATURES) return;
                setEditing({ ...editing, features: [...editing.features, featInput.trim()] });
                setFeatInput("");
              }}
              className="rounded-md gap-1.5"
            >
              <Plus className="h-4 w-4" /> Pridėti
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editing.features.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/60 text-sm">
                {f}
                <button
                  onClick={() => setEditing({ ...editing, features: editing.features.filter((_, idx) => idx !== i) })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
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
        <p className="text-sm text-muted-foreground">{list.length} transporto priemonių</p>
        <Button onClick={() => setEditing({ ...empty })} className="rounded-md gap-2">
          <Plus className="h-4 w-4" /> Naujas transportas
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Kraunama…</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg bg-secondary/30 p-10 text-center">
          <Car className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Dar nėra transporto. Pridėk pirmąjį.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((v) => (
            <div key={v.id} className="rounded-lg bg-secondary/30 p-4 flex gap-3">
              {v.image_url ? (
                <img src={v.image_url} alt="" className="h-20 w-28 rounded object-cover" />
              ) : (
                <div className="h-20 w-28 rounded bg-secondary grid place-items-center">
                  <Car className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70">{v.brand}</p>
                <p className="font-semibold truncate">{v.model}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-primary"><Coins className="h-3 w-3" />{v.price} €</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><Gauge className="h-3 w-3" />{v.top_speed}</span>
                  {v.trunk && <span className="inline-flex items-center gap-1 text-muted-foreground"><Briefcase className="h-3 w-3" />{v.trunk}kg</span>}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => setEditing(v)} className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 inline-flex items-center gap-1">
                    <Edit3 className="h-3 w-3" /> Redaguoti
                  </button>
                  <button onClick={() => remove(v)} className="text-xs px-2 py-1 rounded bg-secondary hover:bg-destructive/20 hover:text-destructive inline-flex items-center gap-1">
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

export default VehiclesManager;
