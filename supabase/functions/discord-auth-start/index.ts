// Redirects the user to Discord's OAuth consent screen
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientId = Deno.env.get("DISCORD_CLIENT_ID");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!clientId || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("return_to") ?? "/";

  const redirectUri = `${supabaseUrl}/functions/v1/discord-auth-callback`;
  const state = btoa(JSON.stringify({ return_to: returnTo, n: crypto.randomUUID() }));

  const discordUrl = new URL("https://discord.com/oauth2/authorize");
  discordUrl.searchParams.set("client_id", clientId);
  discordUrl.searchParams.set("redirect_uri", redirectUri);
  discordUrl.searchParams.set("response_type", "code");
  discordUrl.searchParams.set("scope", "identify email");
  discordUrl.searchParams.set("state", state);
  discordUrl.searchParams.set("prompt", "consent");

  return Response.redirect(discordUrl.toString(), 302);
});
