import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession(request.headers);
  if (session?.user.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (!["admin", "operator", "viewer"].includes(body.role))
    return Response.json({ error: "Invalid role" }, { status: 422 });
  if (id === session.user.id && body.role !== "admin")
    return Response.json(
      { error: "Cannot remove your own admin role" },
      { status: 409 },
    );
  await pool.query('UPDATE "user" SET role=$1 WHERE id=$2', [body.role, id]);
  return Response.json({ ok: true });
}
