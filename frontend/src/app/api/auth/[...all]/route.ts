import { getAuth } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

async function handler(request: Request) {
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  if (path.endsWith("/sign-up/email"))
    return new Response("Use setup or ask an administrator", { status: 403 });
  const { auth } = await getAuth();
  const count = await pool.query('SELECT count(*)::int AS count FROM "user"');
  if (count.rows[0].count === 0)
    return new Response("Complete setup first", { status: 403 });
  return auth.handler(request);
}

export const GET = handler;
export const POST = handler;
