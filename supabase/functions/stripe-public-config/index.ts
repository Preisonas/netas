import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = (Deno.env.get("STRIPE_PUBLISHABLE_KEY") ?? "").trim();

  if (!key.startsWith("pk_")) {
    return new Response(JSON.stringify({ error: "Invalid Stripe publishable key configuration" }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  return new Response(JSON.stringify({ publishableKey: key }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
});
