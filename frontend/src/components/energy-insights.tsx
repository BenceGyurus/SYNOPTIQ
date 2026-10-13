"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  Gauge,
  Trophy,
} from "lucide-react";
import { formatNumber as n, type Insights, type Lang } from "@/lib/dashboard";

export function EnergyInsights({
  data,
  lang,
  retry,
}: {
  data: Insights | null;
  lang: Lang;
  retry: () => void;
}) {
  const [range, setRange] = useState(14);
  const hu = lang === "hu";
  const locale = hu ? "hu-HU" : "en-GB";
  const dayLabel = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  const time = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: data?.timezone,
        })
      : "—";
  const comparison = data?.comparison;
  const delta =
    comparison && comparison.yesterday > 0
      ? (comparison.today / comparison.yesterday - 1) * 100
      : null;
  const days =
    data?.days
      .slice(-range)
      .map((day) => ({ ...day, label: dayLabel(day.date) })) ?? [];
  const today = data?.days.at(-1)?.date;
  function download() {
    if (!data) return;
    const csv = [
      "date,energy_kwh,peak_w,samples,day_finished",
      ...data.days.map(
        (day) =>
          `${day.date},${day.energy ?? ""},${day.peak ?? ""},${day.samples},${day.date !== today}`,
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `solaris-energy-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  if (!data)
    return (
      <section className="surface insight-unavailable">
        <CalendarDays size={22} />
        <p>
          {hu
            ? "A termelési összesítő még nem érhető el."
            : "Energy insights are not available yet."}
        </p>
        <button className="button subtle" onClick={retry}>
          {hu ? "Újrapróbálás" : "Try again"}
        </button>
      </section>
    );
  return (
    <section
      className="energy-section"
      aria-label={hu ? "Termelési elemzés" : "Energy insights"}
    >
      <div className="insight-stats">
        {[
          {
            title: hu ? "Ebben a hónapban" : "This month",
            value: data.monthly,
            unit: "kWh",
            note: hu
              ? `${data.month_observed_days} nap méréseiből`
              : `From ${data.month_observed_days} observed days`,
            icon: CalendarDays,
          },
          {
            title: hu ? "Ebben az évben" : "This year",
            value: data.yearly,
            unit: "kWh",
            note: hu
              ? `${data.year_observed_days} nap méréseiből`
              : `From ${data.year_observed_days} observed days`,
            icon: Gauge,
          },
          {
            title: hu ? "Napi átlag · 30 nap" : "Daily average · 30 days",
            value: data.average,
            unit: "kWh",
            note: hu
              ? "A mért, lezárt napok átlaga"
              : "Average of observed, finished days",
            icon: CalendarDays,
          },
          {
            title: hu ? "Legjobb nap · 30 nap" : "Best day · 30 days",
            value: data.best_day?.energy,
            unit: "kWh",
            note: data.best_day
              ? dayLabel(data.best_day.date)
              : hu
                ? "Még nincs lezárt nap"
                : "No finished days yet",
            icon: Trophy,
          },
        ].map(({ title, value, unit, note, icon: Icon }) => (
          <div className="surface insight-stat" key={title}>
            <div>
              <span>{title}</span>
              <Icon size={17} />
            </div>
            <strong>
              {n(value, 1, lang)} <small>{unit}</small>
            </strong>
            <p>{note}</p>
          </div>
        ))}
      </div>
      <div className="surface energy-history">
        <div className="section-heading wrap-heading">
          <div>
            <p className="eyebrow">
              {hu ? "A TERMELÉS RITMUSA" : "YOUR ENERGY RHYTHM"}
            </p>
            <h2>{hu ? "Minden nap számít" : "Every day adds up"}</h2>
          </div>
          <div className="chart-actions">
            <div className="segmented" aria-label={hu ? "Időszak" : "Period"}>
              {[14, 30].map((value) => (
                <button
                  key={value}
                  aria-pressed={range === value}
                  className={range === value ? "active" : ""}
                  onClick={() => setRange(value)}
                >
                  {value} {hu ? "nap" : "days"}
                </button>
              ))}
            </div>
            <button
              className="icon-button"
              onClick={download}
              title={
                hu ? "30 nap exportálása CSV-ként" : "Export 30 days as CSV"
              }
            >
              <Download size={18} />
            </button>
          </div>
        </div>
        <div
          className="daily-energy-chart"
          role="img"
          aria-label={
            hu
              ? "Napi termelés oszlopdiagram kilowattórában"
              : "Daily energy bar chart in kilowatt-hours"
          }
        >
          {data.observed_days ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={days}
                margin={{ top: 18, right: 2, left: -25, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#e6ebe7" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71817b", fontSize: 11 }}
                  minTickGap={26}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71817b", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "#edf1eb" }}
                  filterNull={false}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e6ebe7",
                  }}
                  formatter={(value) => [
                    value == null
                      ? hu
                        ? "Nincs mérés"
                        : "No readings"
                      : `${n(Number(value), 1, lang)} kWh`,
                    hu ? "Termelés" : "Energy",
                  ]}
                />
                <Bar
                  dataKey="energy"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={30}
                  isAnimationActive={false}
                >
                  {days.map((day) => (
                    <Cell
                      key={day.date}
                      fill={day.date === today ? "#de6a36" : "#38745f"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">
              {hu
                ? "Az első mérés után itt jelenik meg a napi termelés."
                : "Daily energy will appear after the first reading."}
            </div>
          )}
        </div>
        <div className="energy-chart-foot">
          <span>
            <i />
            {hu ? "Lezárt nap" : "Finished day"}
          </span>
          <span>
            <i className="today-dot" />
            {hu ? "Ma · még változik" : "Today · still accumulating"}
          </span>
          <span className="coverage-note">
            {hu
              ? `${data.observed_days}/30 naphoz van mérés · a hiányok üresek`
              : `${data.observed_days}/30 days observed · gaps are blank`}
          </span>
        </div>
      </div>
      <div className="daily-pulse surface">
        <div className="pulse-comparison">
          <span className="pulse-icon">
            {delta != null && delta < 0 ? (
              <ArrowDownRight size={24} />
            ) : (
              <ArrowUpRight size={24} />
            )}
          </span>
          <div>
            <p>
              {hu
                ? "Tegnaphoz képest, azonos időpontig"
                : "Versus yesterday, at the same time"}
            </p>
            <strong>
              {delta == null
                ? "—"
                : `${delta > 0 ? "+" : ""}${n(delta, 1, lang)}%`}
            </strong>
            <small>
              {comparison
                ? `${n(comparison.today, 1, lang)} / ${n(comparison.yesterday, 1, lang)} kWh · ${time(comparison.at)}`
                : hu
                  ? "Két nap friss mérései szükségesek"
                  : "Recent readings from both days needed"}
            </small>
          </div>
        </div>
        <div>
          <span>{hu ? "Mai mért csúcs" : "Today's measured peak"}</span>
          <strong>
            {n(data.today_peak, 0, lang)} <small>W</small>
          </strong>
          <small>{time(data.peak_at)}</small>
        </div>
        <div>
          <span>
            {hu ? "Első / utolsó termelés" : "First / last generation"}
          </span>
          <strong className="time-value">
            {time(data.first_generation)} <span>→</span>{" "}
            {time(data.last_generation)}
          </strong>
          <small>
            {hu
              ? "10 W feletti rögzített mérések"
              : "Recorded readings above 10 W"}
          </small>
        </div>
        <div>
          <span>
            {hu ? "Mai legmagasabb hőmérséklet" : "Today's maximum temperature"}
          </span>
          <strong>
            {n(data.temperature_max, 1, lang)} <small>°C</small>
          </strong>
          <small>
            {hu
              ? `${n(data.samples_today, 0, lang)} rögzített mérés ma`
              : `${n(data.samples_today, 0, lang)} recorded samples today`}
          </small>
        </div>
      </div>
    </section>
  );
}
