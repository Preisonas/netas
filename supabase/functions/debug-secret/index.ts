// Debug endpoint: compares incoming x-mkk-secret with stored MKK_PANELE_SECRET
// Returns lengths, char codes, and match result — does NOT echo the actual secrets
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mkk-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stored = Deno.env.get("MKK_PANELE_SECRET") ?? "";
  const provided = req.headers.get("x-mkk-secret") ?? "";

  const charCodes = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));

  const result = {
    matches: stored === provided,
    stored_length: stored.length,
    provided_length: provided.length,
    stored_first_char_code: stored ? stored.charCodeAt(0) : null,
    stored_last_char_code: stored ? stored.charCodeAt(stored.length - 1) : null,
    provided_first_char_code: provided ? provided.charCodeAt(0) : null,
    provided_last_char_code: provided ? provided.charCodeAt(provided.length - 1) : null,
    stored_char_codes: charCodes(stored),
    provided_char_codes: charCodes(provided),
    headers_received: Object.fromEntries(req.headers.entries()),
  };

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
