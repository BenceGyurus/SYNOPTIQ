"use client";

import { useEffect, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Moon,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Wind,
} from "lucide-react";
import { formatNumber as n, type Lang, type Site } from "@/lib/dashboard";
import {
  bestSolarWindow,
  type SolarWeather as Weather,
} from "@/lib/solar-weather";

function condition(code: number | null, hu: boolean) {
  if (code === 0) return { Icon: Sun, label: hu ? "Derült" : "Clear sky" };
  if (code === 1 || code === 2)
    return { Icon: CloudSun, label: hu ? "Változóan felhős" : "Partly cloudy" };
  if (code === 3) return { Icon: Cloud, label: hu ? "Borult" : "Overcast" };
  if (code === 45 || code === 48)
    return { Icon: CloudFog, label: hu ? "Ködös" : "Fog" };
  if (code != null && code >= 95)
    return { Icon: CloudLightning, label: hu ? "Zivatar" : "Thunderstorm" };
  if (
    code != null &&
    ((code >= 71 && code <= 77) || code === 85 || code === 86)
  )
    return { Icon: CloudSnow, label: hu ? "Havazás" : "Snow" };
  if (code != null && code >= 51)
    return { Icon: CloudRain, label: hu ? "Csapadékos" : "Rain" };
  return { Icon: Cloud, label: hu ? "Időjárás" : "Weather" };
}

export function SolarWeather({
  site,
  lang,
  admin,
  configure,
}: {
  site: Site | null;
  lang: Lang;
  admin: boolean;
  configure: () => void;
}) {
  const [state, setState] = useState<{
    key: string;
    data: Weather | null;
    error: boolean;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const hu = lang === "hu";
  const key = `${site?.latitude},${site?.longitude}`;
  const configured = site?.latitude != null && site.longitude != null;
  useEffect(() => {
    const timer = setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      60000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    const load = () =>
      fetch("/api/weather", { signal: controller.signal, cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("Weather unavailable");
          const data: Weather = await response.json();
          if (!data.configured) throw new Error("Location unavailable");
          setState({ key, data, error: false });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setState({ key, data: null, error: true });
        });
    void load();
    const timer = setInterval(load, 30 * 60 * 1000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [key, configured, retry]);
  const weather = state?.key === key ? state.data : null;
  const failed = state?.key === key && state.error;
  const locale = hu ? "hu-HU" : "en-GB";
  const time = (value: number | null | undefined) =>
    value == null
      ? "—"
      : new Date(value * 1000).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: weather?.timezone,
        });
  const date = (value: number) =>
    new Date(value * 1000).toLocaleDateString(locale, {
      weekday: "short",
      timeZone: weather?.timezone,
    });
  if (!configured)
    return (
      <section className="surface weather-setup">
        <span className="weather-setup-icon">
          <CloudSun size={32} />
        </span>
        <div>
          <p className="eyebrow">
            {hu
              ? "TÖBB KONTEXTUS, JOBB RÁLÁTÁS"
              : "MORE CONTEXT FOR YOUR SOLAR"}
          </p>
          <h2>
            {hu
              ? "Milyen nap vár a napelemekre?"
              : "What's ahead for your panels?"}
          </h2>
          <p>
            {admin
              ? hu
                ? "Adj meg egy helyszínt a napjárás, a felhőzet és a besugárzási előrejelzés megjelenítéséhez. API-kulcs nem szükséges."
                : "Set a location for sunrise, cloud cover and solar radiation forecasts. No API key needed."
              : hu
                ? "A helyszínt az adminisztrátor állíthatja be az időjárási adatokhoz."
                : "An administrator can set the location to enable weather insights."}
          </p>
        </div>
        {admin && (
          <button className="button secondary" onClick={configure}>
            <MapPin size={17} />
            {hu ? "Helyszín beállítása" : "Set location"}
          </button>
        )}
      </section>
    );
  if (!weather)
    return (
      <section className="surface insight-unavailable">
        <CloudSun size={26} />
        <p>
          {failed
            ? hu
              ? "Az időjárási szolgáltatás most nem érhető el. Az inverter adatai ettől függetlenül frissülnek."
              : "Weather is currently unavailable. Inverter readings continue to update."
            : hu
              ? "Napjárás és időjárás betöltése…"
              : "Loading solar weather…"}
        </p>
        {failed && (
          <button
            className="button subtle"
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw size={16} />
            {hu ? "Újrapróbálás" : "Try again"}
          </button>
        )}
      </section>
    );
  const today = weather.days[0];
  const rise = today?.sunrise;
  const set = today?.sunset;
  const daylight = rise != null && set != null && set > rise;
  const progress = daylight
    ? Math.max(0, Math.min(1, (now - rise) / (set - rise)))
    : 0;
  const isDay = daylight && now >= rise && now <= set;
  const best = bestSolarWindow(weather.hours, now);
  const { Icon, label } = condition(weather.current.code, hu);
  const hours = weather.hours.map((hour) => ({
    ...hour,
    label: time(hour.time),
  }));
  return (
    <section
      className="solar-weather-section"
      aria-label={
        hu ? "Napjárás és időjárási előrejelzés" : "Solar weather forecast"
      }
    >
      <div className="weather-grid">
        <div className="surface solar-day-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {hu ? "A MAI NAP PÁLYÁJA" : "TODAY'S SOLAR CLOCK"}
              </p>
              <h2>{hu ? "Napjárás" : "Solar day"}</h2>
            </div>
            {isDay ? <Sun size={22} /> : <Moon size={22} />}
          </div>
          <div className="sun-arc">
            <svg
              viewBox="0 0 300 150"
              role="img"
              aria-label={
                hu
                  ? "A napkelte és napnyugta közötti idő előrehaladása"
                  : "Time progress between sunrise and sunset"
              }
            >
              <path
                d="M30 122 A120 94 0 0 1 270 122"
                fill="none"
                stroke="#d8e1d8"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
              <path d="M20 123 H280" stroke="#d8e1d8" />
              {isDay && (
                <g
                  transform={`translate(${150 - 120 * Math.cos(progress * Math.PI)},${122 - 94 * Math.sin(progress * Math.PI)})`}
                >
                  <circle r="17" fill="#fbede2" />
                  <circle r="8" fill="#de6a36" />
                </g>
              )}
              <text x="150" y="98" textAnchor="middle" className="arc-value">
                {daylight ? n((set - rise) / 3600, 1, lang) : "—"} h
              </text>
              <text x="150" y="116" textAnchor="middle" className="arc-label">
                {hu ? "nappali időszak" : "of daylight"}
              </text>
            </svg>
          </div>
          <div className="sun-times">
            <div>
              <Sunrise size={18} />
              <span>
                {hu ? "Napkelte" : "Sunrise"}
                <strong>{time(rise)}</strong>
              </span>
            </div>
            <div>
              <Sunset size={18} />
              <span>
                {hu ? "Napnyugta" : "Sunset"}
                <strong>{time(set)}</strong>
              </span>
            </div>
          </div>
          <p className="solar-day-note">
            {daylight
              ? isDay
                ? hu
                  ? `Még ${n((set - now) / 3600, 1, lang)} óra napnyugtáig`
                  : `${n((set - now) / 3600, 1, lang)} hours until sunset`
                : hu
                  ? "A nap most a horizont alatt van"
                  : "The sun is below the horizon"
              : hu
                ? "Erre a napra nincs napkelte/napnyugta adat"
                : "No sunrise/sunset data for this day"}
          </p>
        </div>
        <div className="surface weather-now-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {hu ? "IDŐJÁRÁSI MODELL" : "WEATHER MODEL"}
              </p>
              <h2>
                {site?.site_name ||
                  (hu ? "A rendszer környékén" : "Around your system")}
              </h2>
            </div>
            <Icon size={35} />
          </div>
          <div className="weather-temperature">
            {n(weather.current.temperature, 1, lang)}
            <span>°C</span>
          </div>
          <p className="weather-condition">{label}</p>
          <div className="weather-now-metrics">
            <div>
              <Cloud size={17} />
              <span>{hu ? "Felhőzet" : "Cloud cover"}</span>
              <strong>{n(weather.current.clouds, 0, lang)}%</strong>
            </div>
            <div>
              <Wind size={17} />
              <span>{hu ? "Szél" : "Wind"}</span>
              <strong>{n(weather.current.wind, 1, lang)} km/h</strong>
            </div>
          </div>
          <div className="solar-window">
            <Sun size={18} />
            <div>
              <span>
                {hu
                  ? "Legjobb 3 órás besugárzási ablak · 24 h"
                  : "Best 3-hour solar window · next 24 h"}
              </span>
              <strong>
                {best
                  ? `${date(best.start)} ${time(best.start)}–${time(best.end)}`
                  : "—"}
              </strong>
              <small>
                {best
                  ? `${n(best.radiation, 0, lang)} W/m² · ${hu ? "átlagos előrejelzett besugárzás" : "mean forecast radiation"}`
                  : hu
                    ? "Még nincs elegendő előrejelzés"
                    : "Not enough forecast data"}
              </small>
            </div>
          </div>
        </div>
        <div className="surface solar-outlook-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {hu ? "KÖVETKEZŐ NAPOK" : "THE DAYS AHEAD"}
              </p>
              <h2>{hu ? "Napfénykilátások" : "Solar outlook"}</h2>
            </div>
            <CloudSun size={24} />
          </div>
          <div className="forecast-days">
            {weather.days.map((day, index) => {
              const { Icon: DayIcon } = condition(day.code, hu);
              return (
                <div className="forecast-day" key={day.time}>
                  <div>
                    <strong>
                      {index === 0 ? (hu ? "Ma" : "Today") : date(day.time)}
                    </strong>
                    <DayIcon size={25} />
                    <span>
                      {n(day.low, 0, lang)}° / {n(day.high, 0, lang)}°
                    </span>
                  </div>
                  <strong className="forecast-radiation">
                    {n(day.radiation, 1, lang)} <small>kWh/m²</small>
                  </strong>
                  <div className="forecast-day-meta">
                    <span>
                      {n(
                        day.sunshine == null ? null : day.sunshine / 3600,
                        1,
                        lang,
                      )}{" "}
                      h {hu ? "napsütés" : "sunshine"}
                    </span>
                    <span>
                      {n(day.rain, 0, lang)}% {hu ? "csapadék" : "rain"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="insight-note">
            {hu
              ? "A besugárzás vízszintes felületre vonatkozik; a panel tájolása és árnyékolása módosítja a hasznosítható energiát."
              : "Radiation is for a horizontal surface; panel orientation and shading affect usable energy."}
          </p>
        </div>
      </div>
      <div className="surface radiation-surface">
        <div className="section-heading wrap-heading">
          <div>
            <p className="eyebrow">
              {hu
                ? "ELŐREJELZÉS · KÖVETKEZŐ 24 ÓRA"
                : "FORECAST · NEXT 24 HOURS"}
            </p>
            <h2>{hu ? "Napfény és felhők" : "Sunlight and clouds"}</h2>
          </div>
          <div className="chart-key">
            <span>
              <i />
              W/m²
            </span>
            <span>
              <i className="cloud-key" />
              {hu ? "Felhőzet %" : "Cloud cover %"}
            </span>
          </div>
        </div>
        <div
          className="radiation-chart"
          role="img"
          aria-label={
            hu
              ? "Előrejelzett besugárzás és felhőzet"
              : "Forecast solar radiation and cloud cover"
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={hours}
              margin={{ top: 15, right: -15, left: -20, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#e6ebe7" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71817b", fontSize: 11 }}
                minTickGap={40}
              />
              <YAxis
                yAxisId="radiation"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71817b", fontSize: 11 }}
              />
              <YAxis
                yAxisId="clouds"
                orientation="right"
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71817b", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e6ebe7" }}
                formatter={(value, name) => [
                  `${n(Number(value), 0, lang)} ${name === "radiation" ? "W/m²" : "%"}`,
                  name === "radiation"
                    ? hu
                      ? "Besugárzás"
                      : "Radiation"
                    : hu
                      ? "Felhőzet"
                      : "Cloud cover",
                ]}
              />
              <Area
                yAxisId="radiation"
                dataKey="radiation"
                type="monotone"
                stroke="#de6a36"
                fill="#f6dfcc"
                strokeWidth={2.5}
                isAnimationActive={false}
              />
              <Line
                yAxisId="clouds"
                dataKey="clouds"
                type="monotone"
                stroke="#7c9394"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="weather-attribution">
          <span>
            {hu
              ? `Órás modellátlagok · ${weather.timezone} · időjárási időpont: ${time(weather.current.time)}`
              : `Hourly model averages · ${weather.timezone} · weather timestamp: ${time(weather.current.time)}`}
          </span>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            {hu
              ? "Időjárási adatok: Open-Meteo · CC BY 4.0"
              : "Weather data: Open-Meteo · CC BY 4.0"}
          </a>
        </div>
      </div>
    </section>
  );
}
