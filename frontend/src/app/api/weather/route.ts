import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import type { Site } from "@/lib/dashboard";
import { normalizeWeather } from "@/lib/solar-weather";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession(request.headers);
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const site: Site = (
    await pool.query(
      "SELECT site_name, latitude, longitude FROM app_config WHERE id=1",
    )
  ).rows[0];
  if (site.latitude == null || site.longitude == null)
    return Response.json({ configured: false });
  const query = new URLSearchParams({
    latitude: String(site.latitude),
    longitude: String(site.longitude),
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: "3",
    current: "temperature_2m,weather_code,cloud_cover,wind_speed_10m,is_day",
    hourly: "shortwave_radiation,cloud_cover",
    daily:
      "sunrise,sunset,sunshine_duration,shortwave_radiation_sum,weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max",
  });
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${query}`,
      {
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error("Weather unavailable");
    return Response.json(
      normalizeWeather(
        await response.json(),
        site,
        Math.floor(Date.now() / 1000),
      ),
    );
  } catch {
    return Response.json({ error: "Weather unavailable" }, { status: 502 });
  }
}
