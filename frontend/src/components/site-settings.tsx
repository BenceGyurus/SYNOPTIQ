"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { Lang, Site } from "@/lib/dashboard";

type Place = { id: number; name: string; latitude: number; longitude: number };

export function SiteSettings({
  site,
  lang,
  saved,
}: {
  site: Site | null;
  lang: Lang;
  saved: () => Promise<void>;
}) {
  const hu = lang === "hu";
  const [name, setName] = useState(site?.site_name || "");
  const [latitude, setLatitude] = useState(site?.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(site?.longitude?.toString() || "");
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function search() {
    setSearching(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/locations?q=${encodeURIComponent(query.trim())}&lang=${lang}`,
      );
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPlaces(data.results);
      if (!data.results.length)
        setMessage(
          hu
            ? "Nincs találat. Próbálj más településnevet, vagy adj meg koordinátákat."
            : "No results. Try another town name or enter coordinates.",
        );
    } catch {
      setError(
        hu
          ? "A helykeresés most nem érhető el. A koordinátákat kézzel is megadhatod."
          : "Location search is unavailable. You can enter coordinates manually.",
      );
    } finally {
      setSearching(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          site_name: name,
          latitude: latitude.trim() ? Number(latitude) : null,
          longitude: longitude.trim() ? Number(longitude) : null,
        }),
      });
      if (!response.ok) throw new Error();
      await saved();
      setMessage(
        hu
          ? "A helyszín mentve. Az áttekintésen már megjelennek az időjárási adatok."
          : "Location saved. Weather insights are available on the overview.",
      );
    } catch {
      setError(
        hu
          ? "Nem sikerült menteni. Mindkét koordinátát add meg, vagy mindkettőt hagyd üresen."
          : "Could not save. Provide both coordinates or leave both empty.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="surface form-surface site-settings">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {hu ? "HELYSZÍN ÉS NAPFÉNY" : "LOCATION & SUNLIGHT"}
          </p>
          <h2>{hu ? "A rendszer helyszíne" : "System location"}</h2>
        </div>
        <MapPin size={24} />
      </div>
      <p className="insight-note">
        {hu
          ? "A közös helyszín a napjárás és az Open-Meteo előrejelzés alapja. A koordinátákat az időjárási szolgáltatás kapja meg; az inverter sorozatszámát nem küldjük el."
          : "The shared site location powers solar times and Open-Meteo forecasts. Weather requests contain coordinates; the inverter serial number stays local."}
      </p>
      <label htmlFor="site-search">
        {hu ? "Település keresése" : "Find a town"}
      </label>
      <div className="location-search">
        <input
          id="site-search"
          value={query}
          maxLength={80}
          placeholder={hu ? "Például Szeged" : "For example, Cambridge"}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && query.trim().length >= 3) {
              event.preventDefault();
              void search();
            }
          }}
        />
        <button
          type="button"
          className="button secondary"
          disabled={searching || query.trim().length < 3}
          onClick={search}
        >
          <Search size={17} />
          {searching
            ? hu
              ? "Keresés…"
              : "Searching…"
            : hu
              ? "Keresés"
              : "Search"}
        </button>
      </div>
      {places.length > 0 && (
        <ul className="location-results">
          {places.map((place) => (
            <li key={place.id}>
              <button
                onClick={() => {
                  setName(place.name);
                  setLatitude(place.latitude.toString());
                  setLongitude(place.longitude.toString());
                  setPlaces([]);
                  setMessage("");
                }}
              >
                <MapPin size={17} />
                <span>
                  {place.name}
                  <small>
                    {place.latitude}, {place.longitude}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={save}>
        <label>
          {hu ? "Helyszín neve" : "Location name"}
          <input
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            {hu ? "Szélesség" : "Latitude"}
            <input
              type="number"
              step="any"
              min={-90}
              max={90}
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="46.25"
            />
          </label>
          <label>
            {hu ? "Hosszúság" : "Longitude"}
            <input
              type="number"
              step="any"
              min={-180}
              max={180}
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="20.14"
            />
          </label>
        </div>
        <p className="insight-note">
          {hu
            ? "Az időjárás kikapcsolásához hagyd üresen mindkét koordinátát, majd ments. Az API-kulcs nélküli Open-Meteo végpont személyes, nem kereskedelmi használatra érhető el."
            : "To disable weather, clear both coordinates and save. Open-Meteo's keyless endpoint is available for personal, non-commercial use."}{" "}
          <a
            href="https://open-meteo.com/en/terms"
            target="_blank"
            rel="noreferrer"
          >
            {hu ? "Feltételek" : "Terms"}
          </a>
        </p>
        <button className="button primary" disabled={saving}>
          {saving
            ? hu
              ? "Mentés…"
              : "Saving…"
            : hu
              ? "Helyszín mentése"
              : "Save location"}
        </button>
      </form>
      {error && (
        <p className="form-feedback error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-feedback" role="status">
          {message}
        </p>
      )}
      <p className="insight-note location-attribution">
        <a
          href="https://open-meteo.com/en/docs/geocoding-api"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo / GeoNames
        </a>
      </p>
    </section>
  );
}
