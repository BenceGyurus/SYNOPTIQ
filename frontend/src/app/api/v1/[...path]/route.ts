import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = await getSession(request.headers);
  if (!session)
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  const { path } = await context.params;
  if (
    !path.length ||
    !["inverters", "metrics"].includes(path[0]) ||
    path.some((segment) => !/^[A-Za-z0-9_-]+$/.test(segment))
  ) {
    return Response.json({ detail: "Not found" }, { status: 404 });
  }
  const method = request.method;
  const deviceWrite = path[0] === "inverters" && method !== "GET";
  if (deviceWrite && !["admin", "operator"].includes(session.user.role || "")) {
    return Response.json({ detail: "Admin required" }, { status: 403 });
  }
  const base = process.env.BACKEND_URL || "http://backend:8000";
  const source = new URL(request.url);
  const target = new URL(
    `/api/v1/${path.map(encodeURIComponent).join("/")}${source.search}`,
    base,
  );
  const upstream = await fetch(target, {
    method,
    headers: {
      "content-type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
      "x-user-role": session.user.role || "viewer",
    },
    body:
      method === "GET" || method === "HEAD" ? undefined : await request.text(),
    cache: "no-store",
  }).catch(() => null);
  if (!upstream)
    return Response.json({ detail: "Backend unavailable" }, { status: 502 });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") || "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
