import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { validSite } from "@/lib/dashboard";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const session = await getSession(request.headers);
  if (session?.user.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!validSite(body))
    return Response.json({ error: "Invalid location" }, { status: 422 });
  await pool.query(
    "UPDATE app_config SET site_name=$1, latitude=$2, longitude=$3 WHERE id=1",
    [body.site_name.trim(), body.latitude, body.longitude],
  );
  return Response.json({ ok: true });
}
