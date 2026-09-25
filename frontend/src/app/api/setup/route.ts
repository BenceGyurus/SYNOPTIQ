import { getAuth } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const { oidc } = await getAuth();
  const count = await pool.query('SELECT count(*)::int AS count FROM "user"');
  return Response.json({
    required: count.rows[0].count === 0,
    oidcAvailable: Boolean(oidc),
  });
}

export async function POST(request: Request) {
  const { auth } = await getAuth();
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");
  if (
    name.length < 2 ||
    name.length > 80 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    password.length < 12
  ) {
    return Response.json({ error: "Invalid setup data" }, { status: 422 });
  }
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(730122)");
    const count = await client.query(
      'SELECT count(*)::int AS count FROM "user"',
    );
    if (count.rows[0].count !== 0)
      return Response.json(
        { error: "Setup already completed" },
        { status: 409 },
      );
    const created = await auth.api.signUpEmail({
      body: { name, email, password },
    });
    await client.query('UPDATE "user" SET role = $1 WHERE id = $2', [
      "admin",
      created.user.id,
    ]);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Setup failed" }, { status: 500 });
  } finally {
    await client.query("SELECT pg_advisory_unlock(730122)");
    client.release();
  }
}
