import { Pool } from "pg";

const globalPool = globalThis as typeof globalThis & { solarPool?: Pool };

export const pool =
  globalPool.solarPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalPool.solarPool = pool;

let schemaReady: Promise<void> | undefined;

export function ensureAppSchema() {
  schemaReady ??= pool
    .query(
      `
    CREATE TABLE IF NOT EXISTS app_config (
      id integer PRIMARY KEY CHECK (id = 1),
      default_language text NOT NULL DEFAULT 'hu' CHECK (default_language IN ('hu', 'en')),
      discovery_subnet text NOT NULL DEFAULT '192.168.1.0/24',
      oidc_name text,
      oidc_discovery_url text,
      oidc_client_id text,
      oidc_client_secret text
    );
    INSERT INTO app_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `,
    )
    .then(() => undefined)
    .catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  return schemaReady;
}
