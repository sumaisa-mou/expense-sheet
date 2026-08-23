import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Read + write access to the user's spreadsheets. Google has no append-only
 * Sheets scope, and reading the header row is what drives the dynamic form,
 * so this is the narrowest scope that works. Notably absent: any Drive scope.
 */
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

/** Refresh a minute early so a token never expires mid-request. */
const EXPIRY_SKEW_MS = 60_000;

function allowlist(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export type RefreshedTokens = {
  access_token: string;
  expires_at: number;
  refresh_token?: string;
};

/**
 * Exchange a refresh token for a new access token. Google only issues a
 * refresh token when the consent screen is shown with access_type=offline,
 * which is why the provider below forces prompt=consent.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshedTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error_description ?? payload?.error ?? "refresh_failed");
  }

  return {
    access_token: payload.access_token as string,
    expires_at: Date.now() + Number(payload.expires_in ?? 3600) * 1000,
    // Google usually omits this on refresh; keep the old one when it does.
    refresh_token: payload.refresh_token as string | undefined,
  };
}

export function isExpired(expiresAt: number | undefined): boolean {
  return !expiresAt || Date.now() >= expiresAt - EXPIRY_SKEW_MS;
}

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * OAuth alone would let any Google account into a public deployment.
     * ALLOWED_EMAILS is the gate; an empty list means "anyone who can get
     * past Google's consent screen", which is fine while it is in Testing mode.
     */
    signIn({ profile }) {
      const allowed = allowlist();
      if (allowed.length === 0) return true;
      const email = profile?.email?.toLowerCase();
      return Boolean(email && allowed.includes(email));
    },

    async jwt({ token, account }) {
      if (account) {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token ?? token.refresh_token;
        token.expires_at = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3_600_000;
        delete token.error;
        return token;
      }

      if (!isExpired(token.expires_at)) return token;

      if (!token.refresh_token) {
        token.error = "NoRefreshToken";
        return token;
      }

      try {
        const refreshed = await refreshAccessToken(token.refresh_token);
        token.access_token = refreshed.access_token;
        token.expires_at = refreshed.expires_at;
        if (refreshed.refresh_token) token.refresh_token = refreshed.refresh_token;
        delete token.error;
      } catch {
        // Surfaced to the UI so the user is told to sign in again rather than
        // being left with a form that silently fails to submit.
        token.error = "RefreshFailed";
      }
      return token;
    },

    /** Deliberately does not expose access_token — it stays server-side only. */
    session({ session, token }) {
      session.error = token.error;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
