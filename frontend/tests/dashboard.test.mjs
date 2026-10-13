import assert from "node:assert/strict";
import { test } from "node:test";
import { electricalSummary, validSite } from "../src/lib/dashboard.ts";
import { bestSolarWindow, normalizeWeather } from "../src/lib/solar-weather.ts";

test("PV power uses all available inputs and hides inconsistent AC/DC ratios", () => {
  const sample = electricalSummary({
    pac: 470,
    vpv1: 150,
    ipv1: 0.71,
    vpv2: 339.9,
    ipv2: 0.73,
  });
  assert.equal(sample.strings.length, 2);
  assert.ok(Math.abs(sample.dc - 354.627) < 0.001);
  assert.equal(sample.ratio, null);
  const normal = electricalSummary({
    pac: 950,
    vpv1: 500,
    ipv1: 2,
    vpv3: 0,
    ipv3: 0,
  });
  assert.equal(normal.ratio, 95);
  assert.equal(normal.strings.length, 1);
  assert.equal(electricalSummary({ pac: 5, vpv1: 100, ipv1: 0.1 }).ratio, null);
});

test("unknown phases and missing telemetry stay unknown", () => {
  assert.equal(electricalSummary(null).dc, null);
  assert.equal(electricalSummary({ vac1: 230 }).spread, null);
  const result = electricalSummary({
    vac1: 231.5,
    vac2: 236.9,
    vac3: 238.4,
    iac1: 1,
  });
  assert.ok(Math.abs(result.spread - 6.9) < 0.001);
  assert.equal(result.phases[1].current, null);
});

test("location validation accepts zero coordinates and rejects partial or unsafe inputs", () => {
  assert.equal(
    validSite({ site_name: "Equator", latitude: 0, longitude: 0 }),
    true,
  );
  assert.equal(
    validSite({ site_name: "Disabled", latitude: null, longitude: null }),
    true,
  );
  for (const location of [
    { latitude: 91, longitude: 20 },
    { latitude: 46, longitude: null },
    { latitude: "46", longitude: 20 },
    { latitude: NaN, longitude: 20 },
  ])
    assert.equal(validSite({ site_name: "Invalid", ...location }), false);
});

test("best solar window accounts for preceding-hour radiation and avoids gaps", () => {
  const hours = [100, 200, 800, 900, 700, 100].map((radiation, index) => ({
    time: (index + 1) * 3600,
    radiation,
    clouds: 0,
  }));
  assert.deepEqual(bestSolarWindow(hours, 0), {
    start: 7200,
    end: 18000,
    radiation: 800,
  });
  assert.equal(bestSolarWindow([hours[0], hours[2], hours[4]], 0), null);
  assert.equal(
    bestSolarWindow(
      hours.map((hour) => ({ ...hour, radiation: 0 })),
      0,
    ),
    null,
  );
  assert.equal(
    bestSolarWindow(
      hours.map((hour) => ({ ...hour, radiation: null })),
      0,
    ),
    null,
  );
});

test("weather normalization converts MJ to kWh, preserves missing data and excludes cached yesterday", () => {
  const now = Date.parse("2026-10-13T10:00:00Z") / 1000;
  const midnight = Date.parse("2026-10-12T22:00:00Z") / 1000;
  const result = normalizeWeather(
    {
      timezone: "Europe/Budapest",
      current: { time: now, is_day: 1 },
      hourly: {
        time: [now, now + 3600],
        shortwave_radiation: [null, 500],
        cloud_cover: [20, 30],
      },
      daily: {
        time: [midnight - 86400, midnight],
        shortwave_radiation_sum: [36, 18],
        sunrise: [null, null],
      },
    },
    { site_name: "Test", latitude: 46, longitude: 20 },
    now,
  );
  assert.equal(result.days.length, 1);
  assert.equal(result.days[0].radiation, 5);
  assert.equal(result.days[0].sunrise, null);
  assert.equal(result.hours[0].radiation, null);
  assert.equal(result.current.temperature, null);
  assert.throws(() => normalizeWeather({}, {}, now));
});
