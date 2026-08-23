import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    /** Set when the refresh flow failed; the UI asks the user to sign in again. */
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token?: string;
    refresh_token?: string;
    /** Epoch milliseconds. */
    expires_at?: number;
    error?: string;
  }
}

export {};
