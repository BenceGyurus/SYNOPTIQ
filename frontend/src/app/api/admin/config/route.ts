import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession(request.headers);
  if (session?.user.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const row = (
    await pool.query(`SELECT default_language, discovery_subnet,
    COALESCE(oidc_name, '') AS oidc_name,
    COALESCE(oidc_discovery_url, '') AS oidc_discovery_url,
    COALESCE(oidc_client_id, '') AS oidc_client_id FROM app_config WHERE id=1`)
  ).rows[0];
  return Response.json({ ...row, oidc_client_secret: "" });
}

function encrypt(value: string): string {
  const key = createHash("sha256")
    .update(process.env.BETTER_AUTH_SECRET ?? "")
    .digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  return `${iv.toString("hex")}:${cipher.update(value, "utf8", "hex") + cipher.final("hex")}:${cipher.getAuthTag().toString("hex")}`;
}

export async function PUT(request: Request) {
  const session = await getSession(request.headers);
  if (session?.user.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (
    !["hu", "en"].includes(body.default_language) ||
    typeof body.discovery_subnet !== "string" ||
    body.discovery_subnet.length > 30
  ) {
    return Response.json({ error: "Invalid settings" }, { status: 422 });
  }
  if (
    body.oidc_discovery_url &&
    (!/^https:\/\//.test(body.oidc_discovery_url) || !body.oidc_client_id)
  ) {
    return Response.json(
      { error: "OIDC requires HTTPS discovery and client ID" },
      { status: 422 },
    );
  }
  await pool.query(
    `UPDATE app_config SET default_language=$1, discovery_subnet=$2,
    oidc_name=$3, oidc_discovery_url=$4, oidc_client_id=$5,
    oidc_client_secret=CASE WHEN $6::text IS NULL THEN oidc_client_secret ELSE $6 END WHERE id=1`,
    [
      body.default_language,
      body.discovery_subnet,
      body.oidc_name || null,
      body.oidc_discovery_url || null,
      body.oidc_client_id || null,
      body.oidc_client_secret ? encrypt(body.oidc_client_secret) : null,
    ],
  );
  return Response.json({ ok: true });
}
