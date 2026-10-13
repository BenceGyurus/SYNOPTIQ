export const runtime = "nodejs";

export async function GET(request: Request) {
  const target = new URL(
    "/metrics",
    process.env.BACKEND_URL || "http://backend:8000",
  );
  try {
    const response = await fetch(target, {
      headers: { authorization: request.headers.get("authorization") || "" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const headers = new Headers({
      "content-type":
        response.headers.get("content-type") || "text/plain; charset=utf-8",
      "cache-control": "no-store",
    });
    const challenge = response.headers.get("www-authenticate");
    if (challenge) headers.set("www-authenticate", challenge);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return new Response("Metrics backend unavailable\n", {
      status: 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
