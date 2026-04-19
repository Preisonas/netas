import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder: string;
}

const ImageUploader = ({ value, onChange, folder }: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Tik paveikslėliai");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maks. 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("shop-assets").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error("Nepavyko įkelti");
      console.error(error);
      return;
    }
    const { data } = supabase.storage.from("shop-assets").getPublicUrl(path);
    onChange(data.publicUrl);
    toast.success("Įkelta");
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-32 w-48 object-cover rounded-md border border-border/60" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-card border border-border grid place-items-center hover:bg-secondary"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-32 w-48 rounded-md border-2 border-dashed border-border/60 hover:border-primary/60 grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="text-center">
              <Upload className="h-5 w-5 mx-auto mb-1" />
              <span className="text-xs">Įkelti paveikslėlį</span>
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default ImageUploader;
