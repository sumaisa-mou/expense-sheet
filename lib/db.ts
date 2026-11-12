import { createClient, type Client } from "@libsql/client";

export class DbNotConfiguredError extends Error {
  constructor() {
    super(
      "Turso is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the environment and restart.",
    );
  }
}

let client: Client | null = null;
let ready: Promise<unknown> | null = null;

/** Shared Turso client; creates the tables on first use. */
export async function db(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) throw new DbNotConfiguredError();

  client ??= createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
  });

  ready ??= client
    .batch(
      [
        `CREATE TABLE IF NOT EXISTS other_expenses (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           date TEXT NOT NULL,
           category TEXT NOT NULL DEFAULT '',
           remarks TEXT NOT NULL DEFAULT '',
           amount REAL NOT NULL,
           created_at TEXT NOT NULL
         )`,
        `CREATE INDEX IF NOT EXISTS other_expenses_date ON other_expenses (date)`,
        // One row per month, overwritten on every Other entry.
        `CREATE TABLE IF NOT EXISTS month_totals (
           month TEXT PRIMARY KEY,
           sheet_total REAL NOT NULL,
           other_total REAL NOT NULL,
           total REAL NOT NULL,
           updated_at TEXT NOT NULL
         )`,
      ],
      "write",
    )
    .catch((error) => {
      ready = null; // retry on the next request
      throw error;
    });

  await ready;
  return client;
}
