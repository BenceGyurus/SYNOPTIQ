import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "../src/app/api/prometheus/route.ts";

test("Prometheus gateway relays text and the Bearer token without browser cookies", async (context) => {
  context.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url.pathname, "/metrics");
    assert.equal(options.headers.authorization, "Bearer test-only-token");
    assert.equal(options.headers.cookie, undefined);
    assert.equal(options.cache, "no-store");
    return new Response("# TYPE test gauge\ntest 1\n", {
      headers: { "content-type": "text/plain; version=0.0.4; charset=utf-8" },
    });
  });
  const response = await GET(
    new Request("http://localhost/api/prometheus", {
      headers: {
        authorization: "Bearer test-only-token",
        cookie: "browser-session=not-for-exporter",
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(response.headers.get("content-type").includes("version=0.0.4"));
  assert.equal(await response.text(), "# TYPE test gauge\ntest 1\n");
});

test("Prometheus gateway preserves disabled and unauthorized responses", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response("Unauthorized", {
        status: 401,
        headers: { "www-authenticate": 'Bearer realm="solaris-metrics"' },
      }),
  );
  const denied = await GET(new Request("http://localhost/api/prometheus"));
  assert.equal(denied.status, 401);
  assert.ok(denied.headers.get("www-authenticate").includes("Bearer"));
  globalThis.fetch = async () => new Response("Not found", { status: 404 });
  assert.equal(
    (await GET(new Request("http://localhost/api/prometheus"))).status,
    404,
  );
});

test("unavailable metrics backend produces a failed scrape", async (context) => {
  context.mock.method(globalThis, "fetch", async () => {
    throw new Error("timeout");
  });
  const response = await GET(new Request("http://localhost/api/prometheus"));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
