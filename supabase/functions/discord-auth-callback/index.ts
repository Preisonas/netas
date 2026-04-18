// Handles Discord OAuth callback: exchanges code, creates/links Supabase user, returns session via redirect hash
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function htmlRedirect(targetUrl: string, message: string) {
  return new Response(
    `<!doctype html><html><body style="font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div>${message}</div><script>window.location.replace(${JSON.stringify(targetUrl)});</script></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "/";
  let returnTo = "/";
  try {
    if (stateRaw) {
      const decoded = JSON.parse(atob(stateRaw));
      if (typeof decoded.return_to === "string") returnTo = decoded.return_to;
    }
  } catch (_) { /* ignore */ }

  // Build absolute return URL using referer/origin host if returnTo is relative
  const appOrigin = (() => {
    try { return new URL(returnTo).origin; } catch { return new URL(origin).origin; }
  })();
  const targetBase = returnTo.startsWith("http") ? returnTo : `${appOrigin}${returnTo}`;

  if (error) {
    return htmlRedirect(`${targetBase}#discord_error=${encodeURIComponent(error)}`, "Discord login canceled.");
  }
  if (!code) {
    return htmlRedirect(`${targetBase}#discord_error=missing_code`, "Missing code.");
  }

  const clientId = Deno.env.get("DISCORD_CLIENT_ID");
  const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!clientId || !clientSecret || !supabaseUrl || !serviceKey) {
    return htmlRedirect(`${targetBase}#discord_error=server_not_configured`, "Server not configured.");
  }

  const redirectUri = `${supabaseUrl}/functions/v1/discord-auth-callback`;

  // 1. Exchange code for Discord access token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    console.error("Discord token exchange failed", tokenRes.status, t);
    return htmlRedirect(`${targetBase}#discord_error=token_exchange_failed`, "Token exchange failed.");
  }
  const tokenJson = await tokenRes.json();

  // 2. Fetch Discord user
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) {
    console.error("Discord user fetch failed", userRes.status, await userRes.text());
    return htmlRedirect(`${targetBase}#discord_error=user_fetch_failed`, "User fetch failed.");
  }
  const dUser = await userRes.json() as {
    id: string; username: string; global_name?: string; avatar?: string; email?: string; verified?: boolean;
  };

  if (!dUser.email) {
    return htmlRedirect(`${targetBase}#discord_error=no_email`, "Discord account has no verified email.");
  }

  const avatarUrl = dUser.avatar
    ? `https://cdn.discordapp.com/avatars/${dUser.id}/${dUser.avatar}.png`
    : null;
  const username = dUser.global_name ?? dUser.username;

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 3. Create or fetch user
  // Try to find existing user by email via listUsers (paginated; for small projects this is fine)
  let userId: string | null = null;
  const { data: existing, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    console.error("listUsers failed", listErr);
    return htmlRedirect(`${targetBase}#discord_error=list_users_failed`, "Could not look up user.");
  }
  const found = existing.users.find((u) => u.email?.toLowerCase() === dUser.email!.toLowerCase());
  if (found) {
    userId = found.id;
    // Update metadata so profile stays fresh
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...found.user_metadata,
        discord_id: dUser.id,
        username,
        avatar_url: avatarUrl,
        full_name: username,
      },
    });
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: dUser.email,
      email_confirm: true,
      user_metadata: {
        discord_id: dUser.id,
        username,
        avatar_url: avatarUrl,
        full_name: username,
        provider: "discord",
      },
    });
    if (createErr || !created.user) {
      console.error("createUser failed", createErr);
      return htmlRedirect(`${targetBase}#discord_error=create_user_failed`, "Could not create user.");
    }
    userId = created.user.id;
  }

  // 4. Upsert profile (defensive — trigger should also have inserted)
  await admin.from("profiles").upsert({
    user_id: userId,
    discord_id: dUser.id,
    username,
    avatar_url: avatarUrl,
    email: dUser.email,
  }, { onConflict: "user_id" });

  // 5. Generate a magic link to obtain a usable session, then redirect with tokens in URL hash
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: dUser.email,
    options: { redirectTo: targetBase },
  });
  if (linkErr || !linkData) {
    console.error("generateLink failed", linkErr);
    return htmlRedirect(`${targetBase}#discord_error=link_failed`, "Could not create session.");
  }

  // The action_link goes through Supabase /auth/v1/verify which sets the session and redirects to redirectTo with tokens in hash
  return Response.redirect(linkData.properties.action_link, 302);
});
