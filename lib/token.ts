import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { isExpired, refreshAccessToken } from "@/lib/auth";

const SECURE_COOKIE = "__Secure-authjs.session-token";
const PLAIN_COOKIE = "authjs.session-token";

export class AuthRequiredError extends Error {}

/**
 * Pull the Google access token out of the session JWT.
 *
 * The token is read here, in the route handler, rather than being exposed on
 * the session object — so it never travels to the browser.
 *
 * The jwt callback in lib/auth.ts already refreshes expired tokens, but it
 * only runs when the session is touched. A refresh is repeated here so an API
 * call made on a stale cookie still works instead of returning a 401.
 */
export async function getGoogleAccessToken(req: NextRequest): Promise<string> {
  // Auth.js derives the JWT salt from the cookie name, which varies by
  // protocol, so use whichever cookie the request actually carries.
  const salt = req.cookies.has(SECURE_COOKIE) ? SECURE_COOKIE : PLAIN_COOKIE;

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    salt,
    secureCookie: salt === SECURE_COOKIE,
  });

  if (!token) throw new AuthRequiredError("Not signed in.");

  if (!isExpired(token.expires_at) && token.access_token) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    throw new AuthRequiredError(
      "Your Google session expired. Please sign out and sign in again.",
    );
  }

  try {
    const refreshed = await refreshAccessToken(token.refresh_token);
    return refreshed.access_token;
  } catch {
    throw new AuthRequiredError(
      "Could not refresh Google access. Please sign out and sign in again.",
    );
  }
}
