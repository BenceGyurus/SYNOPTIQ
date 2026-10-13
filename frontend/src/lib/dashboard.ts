export type Lang = "hu" | "en";
export type Site = {
  site_name: string;
  latitude: number | null;
  longitude: number | null;
};
export type DayEnergy = {
  date: string;
  energy: number | null;
  peak: number | null;
  samples: number;
};
export type Insights = {
  timezone: string;
  days: DayEnergy[];
  today: number | null;
  yesterday: number | null;
  monthly: number | null;
  yearly: number | null;
  month_observed_days: number;
  year_observed_days: number;
  average: number | null;
  best_day: DayEnergy | null;
  observed_days: number;
  today_peak: number | null;
  peak_at: string | null;
  first_generation: string | null;
  last_generation: string | null;
  temperature_max: number | null;
  samples_today: number;
  comparison: { today: number; yesterday: number; at: string } | null;
};
type Reading = Partial<
  Record<
    | "pac"
    | "tmp"
    | "fac"
    | "pf"
    | "hto"
    | "wan"
    | "err"
    | "vpv1"
    | "vpv2"
    | "vpv3"
    | "ipv1"
    | "ipv2"
    | "ipv3"
    | "vac1"
    | "vac2"
    | "vac3"
    | "iac1"
    | "iac2"
    | "iac3",
    number | null
  >
>;

export function electricalSummary(reading: Reading | null) {
  const strings = ([1, 2, 3] as const).flatMap((index) => {
    const voltage = reading?.[`vpv${index}`];
    const current = reading?.[`ipv${index}`];
    if (voltage == null || current == null || voltage <= 0 || current < 0)
      return [];
    return [{ index, voltage, current, power: voltage * current }];
  });
  const dc = strings.length
    ? strings.reduce((sum, pv) => sum + pv.power, 0)
    : null;
  const ac = reading?.pac;
  // A ratio above 100% indicates inconsistent input readings, not real efficiency.
  const ratio =
    dc != null && dc >= 100 && ac != null && ac > 0 && ac <= dc
      ? (ac / dc) * 100
      : null;
  const phases = ([1, 2, 3] as const).flatMap((index) => {
    const voltage = reading?.[`vac${index}`];
    if (voltage == null || voltage <= 0) return [];
    return [{ index, voltage, current: reading?.[`iac${index}`] ?? null }];
  });
  const spread =
    phases.length >= 2
      ? Math.max(...phases.map((phase) => phase.voltage)) -
        Math.min(...phases.map((phase) => phase.voltage))
      : null;
  return { strings, dc, ratio, phases, spread };
}

export const formatNumber = (
  value: number | null | undefined,
  digits = 1,
  lang: Lang = "hu",
) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat(lang === "hu" ? "hu-HU" : "en-GB", {
        maximumFractionDigits: digits,
      }).format(value);

export function validSite(value: unknown): value is Site {
  if (!value || typeof value !== "object") return false;
  const site = value as Site;
  return (
    typeof site.site_name === "string" &&
    site.site_name.length <= 100 &&
    ((site.latitude === null && site.longitude === null) ||
      (typeof site.latitude === "number" &&
        Number.isFinite(site.latitude) &&
        Math.abs(site.latitude) <= 90 &&
        typeof site.longitude === "number" &&
        Number.isFinite(site.longitude) &&
        Math.abs(site.longitude) <= 180))
  );
}
