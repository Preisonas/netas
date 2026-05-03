import { supabase } from "@/integrations/supabase/client";
import type { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * Wrapper around supabase.functions.invoke that extracts the real error
 * message from the edge function's JSON response body, instead of the
 * generic "Edge Function returned a non-2xx status code".
 */
export async function invokeFn<T = any>(
  name: string,
  options?: { body?: any; headers?: Record<string, string> }
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke<T>(name, options);

    if (error) {
      // FunctionsHttpError exposes the original Response on .context
      const ctx = (error as FunctionsHttpError & { context?: Response }).context;
      let message = error.message || "Klaida";

      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.clone().json();
          if (body?.error) message = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
          else if (body?.message) message = body.message;
        } catch {
          try {
            const txt = await ctx.clone().text();
            if (txt) message = txt;
          } catch {}
        }
      } else if (data && typeof data === "object" && (data as any).error) {
        message = (data as any).error;
      }
      return { data: null, error: message };
    }

    // Some functions return 200 with { error: "..." }
    if (data && typeof data === "object" && (data as any).error) {
      return { data: null, error: (data as any).error };
    }

    return { data: data as T, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || "Tinklo klaida" };
  }
}
