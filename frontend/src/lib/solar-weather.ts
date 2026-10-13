import type { Site } from "./dashboard";

export type SolarHour = {
  time: number;
  radiation: number | null;
  clouds: number | null;
};
export type SolarDay = {
  time: number;
  sunrise: number | null;
  sunset: number | null;
  sunshine: number | null;
  radiation: number | null;
  low: number | null;
  high: number | null;
  rain: number | null;
  code: number | null;
};
export type SolarWeather = {
  configured: true;
  site: Site;
  timezone: string;
  fetched_at: number;
  current: {
    time: number;
    temperature: number | null;
    clouds: number | null;
    wind: number | null;
    code: number | null;
    is_day: boolean;
  };
  hours: SolarHour[];
  days: SolarDay[];
};

export function bestSolarWindow(hours: SolarHour[], now: number) {
  const future = hours.filter(
    (hour) => hour.time >= now && hour.time <= now + 24 * 3600,
  );
  let best: { start: number; end: number; radiation: number } | null = null;
  for (let index = 0; index <= future.length - 3; index++) {
    const slot = future.slice(index, index + 3);
    if (
      slot.some((hour) => hour.radiation == null) ||
      slot[2].time - slot[0].time !== 7200
    )
      continue;
    const radiation =
      slot.reduce((sum, hour) => sum + (hour.radiation ?? 0), 0) / 3;
    // Hourly radiation is the mean of the preceding hour.
    const start = slot[0].time - 3600;
    if (start < now || radiation <= 0) continue;
    if (!best || radiation > best.radiation)
      best = { start, end: slot[2].time, radiation };
  }
  return best;
}

export function normalizeWeather(
  data: {
    timezone?: string;
    current?: Record<string, unknown>;
    hourly?: Record<string, unknown[]>;
    daily?: Record<string, unknown[]>;
  },
  site: Site,
  now: number,
): SolarWeather {
  const numeric = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const current = data.current;
  const hourly = data.hourly;
  const daily = data.daily;
  if (
    !current ||
    !hourly?.time ||
    !daily?.time ||
    !numeric(current.time) ||
    !data.timezone
  )
    throw new Error("Invalid weather response");
  // Validate the provider's time zone before using it in Intl formatters.
  new Intl.DateTimeFormat("en", { timeZone: data.timezone });
  const dayKey = (time: number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: data.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(time * 1000));
  const todayKey = dayKey(now);
  return {
    configured: true,
    site,
    timezone: data.timezone,
    fetched_at: now,
    current: {
      time: Number(current.time),
      temperature: numeric(current.temperature_2m),
      clouds: numeric(current.cloud_cover),
      wind: numeric(current.wind_speed_10m),
      code: numeric(current.weather_code),
      is_day: current.is_day === 1,
    },
    hours: hourly.time.flatMap((value, index) => {
      const time = numeric(value);
      if (time == null || time < now - 3600 || time > now + 25 * 3600)
        return [];
      return [
        {
          time,
          radiation: numeric(hourly.shortwave_radiation?.[index]),
          clouds: numeric(hourly.cloud_cover?.[index]),
        },
      ];
    }),
    days: daily.time
      .flatMap((value, index) => {
        const time = numeric(value);
        if (time == null || dayKey(time) < todayKey) return [];
        const radiation = numeric(daily.shortwave_radiation_sum?.[index]);
        return [
          {
            time,
            sunrise: numeric(daily.sunrise?.[index]),
            sunset: numeric(daily.sunset?.[index]),
            sunshine: numeric(daily.sunshine_duration?.[index]),
            radiation: radiation == null ? null : radiation / 3.6,
            low: numeric(daily.temperature_2m_min?.[index]),
            high: numeric(daily.temperature_2m_max?.[index]),
            rain: numeric(daily.precipitation_probability_max?.[index]),
            code: numeric(daily.weather_code?.[index]),
          },
        ];
      })
      .slice(0, 3),
  };
}
