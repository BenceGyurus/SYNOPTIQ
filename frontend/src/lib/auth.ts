import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { getMigrations } from "better-auth/db/migration";
import { createDecipheriv, createHash } from "node:crypto";
import { pool, ensureAppSchema } from "./db";

type OidcConfig = {
  name: string;
  discoveryUrl: string;
  clientId: string;
  clientSecret: string;
};

export function decryptSecret(value: string): string {
  if (!value) return "";
  const [iv, tag, ciphertext] = value.split(":");
  const key = createHash("sha256")
    .update(process.env.BETTER_AUTH_SECRET ?? "")
    .digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

function createAuth(oidc?: OidcConfig) {
  return betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "viewer",
          input: false,
        },
        language: {
          type: "string",
          required: false,
          defaultValue: "",
          input: false,
        },
      },
    },
    plugins: [
      genericOAuth({
        config: oidc
          ? [
              {
                providerId: "oidc",
                discoveryUrl: oidc.discoveryUrl,
                clientId: oidc.clientId,
                clientSecret: oidc.clientSecret,
                scopes: ["openid", "profile", "email"],
              },
            ]
          : [],
      }),
    ],
  });
}

const envOidc =
  process.env.OIDC_DISCOVERY_URL &&
  process.env.OIDC_CLIENT_ID &&
  process.env.OIDC_CLIENT_SECRET
    ? {
        name: process.env.OIDC_NAME || "OpenID Connect",
        discoveryUrl: process.env.OIDC_DISCOVERY_URL,
        clientId: process.env.OIDC_CLIENT_ID,
        clientSecret: process.env.OIDC_CLIENT_SECRET,
      }
    : undefined;

let migrations: Promise<void> | undefined;
let cached: { key: string; auth: ReturnType<typeof createAuth> } | undefined;

export async function getAuth() {
  await ensureAppSchema();
  const row = (await pool.query("SELECT * FROM app_config WHERE id = 1"))
    .rows[0];
  const oidc: OidcConfig | undefined =
    envOidc ??
    (row.oidc_discovery_url && row.oidc_client_id && row.oidc_client_secret
      ? {
          name: row.oidc_name || "OpenID Connect",
          discoveryUrl: row.oidc_discovery_url,
          clientId: row.oidc_client_id,
          clientSecret: decryptSecret(row.oidc_client_secret),
        }
      : undefined);
  const key = JSON.stringify(oidc ?? null);
  if (!cached || cached.key !== key) cached = { key, auth: createAuth(oidc) };
  const auth = cached.auth;
  migrations ??= (async () => {
    const client = await pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock(730123)");
      const { runMigrations } = await getMigrations(auth.options);
      await runMigrations();
    } finally {
      try {
        await client.query("SELECT pg_advisory_unlock(730123)");
      } finally {
        client.release();
      }
    }
  })().catch((error) => {
    migrations = undefined;
    throw error;
  });
  await migrations;
  return { auth, oidc: oidc ? { name: oidc.name } : null };
}

export async function getSession(headers: Headers) {
  const { auth } = await getAuth();
  return auth.api.getSession({ headers });
}
