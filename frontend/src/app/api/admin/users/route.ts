import { getAuth, getSession } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession(request.headers);
  if (session?.user.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const users = await pool.query(
    'SELECT id, name, email, role, language FROM "user" ORDER BY "createdAt" ASC',
  );
  return Response.json(users.rows);
}

export async function POST(request: Request) {
  const session = await getSession(request.headers);
  if (session?.user.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (
    !body.name ||
    !body.email ||
    typeof body.password !== "string" ||
    body.password.length < 12
  ) {
    return Response.json({ error: "Invalid user" }, { status: 422 });
  }
  const { auth } = await getAuth();
  await auth.api.signUpEmail({
    body: { name: body.name, email: body.email, password: body.password },
  });
  return Response.json({ ok: true });
}
