import { getAuth, getSession } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession(request.headers);
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { oidc } = await getAuth();
  const row = (
    await pool.query(
      "SELECT default_language, discovery_subnet FROM app_config WHERE id = 1",
    )
  ).rows[0];
  return Response.json({
    ...row,
    oidc,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      language: session.user.language || row.default_language,
    },
  });
}

export async function PUT(request: Request) {
  const session = await getSession(request.headers);
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { language } = await request.json().catch(() => ({}));
  if (language !== "hu" && language !== "en")
    return Response.json({ error: "Invalid language" }, { status: 422 });
  await pool.query('UPDATE "user" SET language = $1 WHERE id = $2', [
    language,
    session.user.id,
  ]);
  return Response.json({ ok: true });
}
