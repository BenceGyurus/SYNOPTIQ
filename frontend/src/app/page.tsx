"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  CircleHelp,
  Cpu,
  Globe2,
  LogOut,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { createAuthClient } from "better-auth/react";

type Lang = "hu" | "en";
type Inverter = {
  id: number;
  name: string;
  serial_number: string;
  ip_address: string;
  port: number;
};
type Metric = {
  id: number;
  timestamp: string;
  flg: number;
  pac: number;
  sac: number;
  qac: number;
  etd: number;
  eto: number;
  hto: number;
  tmp: number;
  fac: number;
  pf: number;
  wan: number;
  err: number;
  vac1: number;
  vac2: number;
  vac3: number;
  iac1: number;
  iac2: number;
  iac3: number;
  vpv1: number;
  vpv2: number;
  vpv3: number;
  ipv1: number;
  ipv2: number;
  ipv3: number;
};
type Preferences = {
  default_language: Lang;
  discovery_subnet: string;
  oidc: { name: string } | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    language: Lang;
  };
};
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  language: string;
};
type Discovery = {
  ip_address: string;
  port: number;
  serial_number: string;
  model: string;
};

const authClient = createAuthClient();
const words = {
  hu: {
    overview: "Áttekintés",
    history: "Előzmények",
    last7: "7 nap",
    last30: "30 nap",
    gridVoltage: "Hálózati feszültség",
    average: "Átlag",
    minimum: "Minimum",
    maximum: "Maximum",
    noHistory: "Nincs adat a választott időszakban",
    devices: "Eszközök",
    settings: "Beállítások",
    live: "Élő termelés",
    today: "Ma termelt energia",
    total: "Összes termelés",
    peak: "Napi csúcs",
    production: "Termelés ma",
    ac: "Hálózat",
    dc: "Napelem ágak",
    details: "Részletes adatok",
    hide: "Bezárás",
    online: "Elérhető",
    offline: "Nincs friss adat",
    updated: "Utolsó mérés",
    noDevice: "Még nincs inverter hozzáadva",
    noDeviceText:
      "Adj meg egy IP címet és sorozatszámot, vagy keresd meg az eszközt a helyi hálózaton.",
    addDevice: "Inverter hozzáadása",
    scan: "Keresés",
    scanning: "Keresés folyamatban…",
    subnet: "Helyi alhálózat",
    serial: "Sorozatszám",
    address: "IP cím",
    name: "Név",
    save: "Mentés",
    cancel: "Mégse",
    role: "Jogosultság",
    language: "Nyelv",
    users: "Felhasználók",
    addUser: "Felhasználó hozzáadása",
    password: "Jelszó",
    email: "E-mail cím",
    login: "Bejelentkezés",
    setup: "Első indítás",
    setupText: "Hozd létre a rendszergazdai fiókot a rendszer használatához.",
    oidc: "OpenID Connect",
    discovery: "Discovery URL",
    clientId: "Client ID",
    clientSecret: "Client secret",
    defaultLang: "Alapértelmezett nyelv",
    logout: "Kijelentkezés",
    error: "Nem sikerült betölteni az adatokat",
    refresh: "Frissítés",
    status: "Állapot",
    temperature: "Hőmérséklet",
    frequency: "Frekvencia",
    powerFactor: "Teljesítménytényező",
    operatingHours: "Üzemóra",
    active: "Hatásos teljesítmény",
    apparent: "Látszólagos teljesítmény",
    reactive: "Meddő teljesítmény",
    warning: "Figyelmeztetés",
    fault: "Hiba",
    viewer: "Megtekintő",
    operator: "Kezelő",
    admin: "Adminisztrátor",
    sample: "Nincs még mérés",
    all: "Összes",
    hello: "Üdv újra",
    model: "Modell",
    add: "Hozzáadás",
    choose: "Válassz egy eszközt",
    loading: "Betöltés…",
  },
  en: {
    overview: "Overview",
    history: "History",
    last7: "7 days",
    last30: "30 days",
    gridVoltage: "Grid voltage",
    average: "Average",
    minimum: "Minimum",
    maximum: "Maximum",
    noHistory: "No data in this period",
    devices: "Devices",
    settings: "Settings",
    live: "Live generation",
    today: "Energy today",
    total: "Lifetime energy",
    peak: "Daily peak",
    production: "Production today",
    ac: "Grid",
    dc: "Solar strings",
    details: "Technical details",
    hide: "Close",
    online: "Online",
    offline: "No recent data",
    updated: "Last reading",
    noDevice: "No inverter configured yet",
    noDeviceText:
      "Enter an IP address and serial number, or find the device on your local network.",
    addDevice: "Add inverter",
    scan: "Discover",
    scanning: "Scanning…",
    subnet: "Local subnet",
    serial: "Serial number",
    address: "IP address",
    name: "Name",
    save: "Save",
    cancel: "Cancel",
    role: "Permission",
    language: "Language",
    users: "Users",
    addUser: "Add user",
    password: "Password",
    email: "Email address",
    login: "Sign in",
    setup: "First run",
    setupText: "Create the administrator account to start using the system.",
    oidc: "OpenID Connect",
    discovery: "Discovery URL",
    clientId: "Client ID",
    clientSecret: "Client secret",
    defaultLang: "Default language",
    logout: "Sign out",
    error: "Could not load data",
    refresh: "Refresh",
    status: "Status",
    temperature: "Temperature",
    frequency: "Frequency",
    powerFactor: "Power factor",
    operatingHours: "Operating hours",
    active: "Active power",
    apparent: "Apparent power",
    reactive: "Reactive power",
    warning: "Warning",
    fault: "Fault",
    viewer: "Viewer",
    operator: "Operator",
    admin: "Administrator",
    sample: "No readings yet",
    all: "All",
    hello: "Welcome back",
    model: "Model",
    add: "Add",
    choose: "Choose a device",
    loading: "Loading…",
  },
};
const number = (value: number | undefined, digits = 1, lang: Lang = "hu") =>
  value == null
    ? "—"
    : new Intl.NumberFormat(lang === "hu" ? "hu-HU" : "en-US", {
        maximumFractionDigits: digits,
      }).format(value);
const api = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => ({}))).detail ||
        `HTTP ${response.status}`,
    );
  return response.json();
};

export function SolarisApp({
  initialPanel = "none",
}: {
  initialPanel?: "none" | "history";
}) {
  const [setup, setSetup] = useState<boolean | null>(null);
  const [oidcAvailable, setOidcAvailable] = useState(false);
  const [session, setSession] = useState<boolean | null>(null);
  const [pref, setPref] = useState<Preferences | null>(null);
  const [lang, setLang] = useState<Lang>("hu");
  const [inverters, setInverters] = useState<Inverter[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [latest, setLatest] = useState<Metric | null>(null);
  const [history, setHistory] = useState<Metric[]>([]);
  const [stats, setStats] = useState<{ daily: number; total: number } | null>(
    null,
  );
  const [panel, setPanel] = useState<
    "none" | "history" | "devices" | "settings"
  >(initialPanel);
  const [historyRange, setHistoryRange] = useState<"today" | "7d" | "30d">(
    "today",
  );
  const [historyMetric, setHistoryMetric] = useState<
    "power" | "voltage" | "frequency" | "temperature"
  >("power");
  const [historical, setHistorical] = useState<
    { timestamp: string; value: number }[]
  >([]);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    serial_number: "",
    ip_address: "",
    port: 8484,
  });
  const [discovered, setDiscovered] = useState<Discovery[]>([]);
  const [config, setConfig] = useState({
    default_language: "hu",
    discovery_subnet: "192.168.1.0/24",
    oidc_name: "",
    oidc_discovery_url: "",
    oidc_client_id: "",
    oidc_client_secret: "",
  });
  const [users, setUsers] = useState<User[]>([]);
  const t = words[lang];
  const admin = pref?.user.role === "admin";
  const canManageDevices = admin || pref?.user.role === "operator";

  useEffect(() => {
    Promise.all([
      api<{ required: boolean; oidcAvailable: boolean }>("/api/setup"),
      fetch("/api/auth/get-session").then((r) => r.json()),
    ])
      .then(([state, auth]) => {
        setSetup(state.required);
        setOidcAvailable(state.oidcAvailable);
        setSession(Boolean(auth?.user));
      })
      .catch(() => {
        setSetup(false);
        setSession(false);
      });
  }, []);

  const load = useCallback(async () => {
    try {
      const [p, devices] = await Promise.all([
        api<Preferences>("/api/preferences"),
        api<Inverter[]>("/api/v1/inverters"),
      ]);
      setPref(p);
      setLang(p.user.language || p.default_language);
      setInverters(devices);
      setSelected((old) =>
        old && devices.some((item) => item.id === old)
          ? old
          : (devices[0]?.id ?? null),
      );
      setConfig((old) => ({
        ...old,
        default_language: p.default_language,
        discovery_subnet: p.discovery_subnet,
      }));
      setError("");
    } catch {
      setError(t.error);
    }
  }, [t.error]);

  useEffect(() => {
    if (session) void Promise.resolve().then(load);
  }, [session, load]);

  const loadMetrics = useCallback(async () => {
    if (!selected) {
      setLatest(null);
      setHistory([]);
      setStats(null);
      return;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [last, chart, summary] = await Promise.all([
      api<Metric>(`/api/v1/metrics/latest?inverter_id=${selected}`).catch(
        () => null,
      ),
      api<Metric[]>(
        `/api/v1/metrics/timeseries?inverter_id=${selected}&start_time=${encodeURIComponent(start.toISOString())}&end_time=${encodeURIComponent(new Date().toISOString())}&bucket_minutes=5`,
      ).catch(() => []),
      api<{ daily: number; total: number }>(
        `/api/v1/metrics/stats?inverter_id=${selected}`,
      ).catch(() => null),
    ]);
    setLatest(last);
    setHistory(chart);
    setStats(summary);
    setLastRefresh(Date.now());
  }, [selected]);
  useEffect(() => {
    if (!session) return;
    void Promise.resolve().then(loadMetrics);
    const timer = setInterval(loadMetrics, 30000);
    return () => clearInterval(timer);
  }, [session, loadMetrics]);

  const loadHistorical = useCallback(async () => {
    if (!selected) {
      setHistorical([]);
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (historyRange === "7d") start.setDate(start.getDate() - 6);
    if (historyRange === "30d") start.setDate(start.getDate() - 29);
    const bucket =
      historyRange === "today" ? 5 : historyRange === "7d" ? 30 : 60;
    try {
      setHistorical(
        await api<{ timestamp: string; value: number }[]>(
          `/api/v1/metrics/timeseries?inverter_id=${selected}&start_time=${encodeURIComponent(start.toISOString())}&end_time=${encodeURIComponent(end.toISOString())}&bucket_minutes=${bucket}&metric=${historyMetric}`,
        ),
      );
    } catch {
      setHistorical([]);
    }
  }, [selected, historyRange, historyMetric]);
  useEffect(() => {
    if (session && panel === "history")
      void Promise.resolve().then(loadHistorical);
  }, [session, panel, loadHistorical]);

  const current = inverters.find((item) => item.id === selected);
  const online = latest
    ? lastRefresh - new Date(latest.timestamp).getTime() < 180000
    : false;
  const peak = useMemo(
    () => history.reduce((max, item) => Math.max(max, item.pac ?? 0), 0),
    [history],
  );
  const chart = useMemo(
    () =>
      history.map((item) => ({
        time: new Date(item.timestamp).toLocaleTimeString(
          lang === "hu" ? "hu-HU" : "en-US",
          { hour: "2-digit", minute: "2-digit" },
        ),
        power: item.pac,
      })),
    [history, lang],
  );
  const historyUnit = {
    power: "W",
    voltage: "V",
    frequency: "Hz",
    temperature: "°C",
  }[historyMetric];
  const historyChart = historical.map((item) => ({
    time: new Date(item.timestamp).toLocaleString(
      lang === "hu" ? "hu-HU" : "en-US",
      historyRange === "today"
        ? { hour: "2-digit", minute: "2-digit" }
        : { month: "numeric", day: "numeric", hour: "2-digit" },
    ),
    value: item.value,
  }));
  const historyValues = historical.map((item) => item.value);

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (setup) {
        await api("/api/setup", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
          }),
        });
        setSetup(false);
      }
      const result = await authClient.signIn.email({
        email: form.email,
        password: form.password,
      });
      if (result.error) throw new Error(result.error.message);
      setSession(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  async function saveDevice(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/inverters", {
        method: "POST",
        body: JSON.stringify({
          name: form.name || form.serial_number,
          serial_number: form.serial_number,
          ip_address: form.ip_address,
          port: form.port,
        }),
      });
      await load();
      setForm((old) => ({
        ...old,
        name: "",
        serial_number: "",
        ip_address: "",
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  async function scan() {
    setBusy(true);
    setError("");
    try {
      setDiscovered(
        await api<Discovery[]>("/api/v1/inverters/discover", {
          method: "POST",
          body: JSON.stringify({ subnet: config.discovery_subnet, port: 8484 }),
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  async function saveConfig(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  async function setLanguage(value: Lang) {
    setLang(value);
    if (session) {
      await api("/api/preferences", {
        method: "PUT",
        body: JSON.stringify({ language: value }),
      });
      await load();
    }
  }
  async function loadUsers() {
    try {
      setUsers(await api<User[]>("/api/admin/users"));
    } catch {
      setUsers([]);
    }
  }
  async function loadConfig() {
    try {
      setConfig(await api<typeof config>("/api/admin/config"));
    } catch {
      /* settings retain current values */
    }
  }
  async function changeRole(id: string, role: string) {
    await api(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    await loadUsers();
  }
  async function addUser(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });
      await loadUsers();
      setForm((old) => ({ ...old, name: "", email: "", password: "" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  if (setup === null || session === null)
    return (
      <div className="center-state">
        <Sun size={36} />
        <span>{t.loading}</span>
      </div>
    );
  if (!session)
    return (
      <main className="auth-shell">
        <div className="auth-side">
          <div className="brand">
            <span className="brand-mark">
              <Sun size={24} />
            </span>
            <span>
              solaris<span className="brand-dot">.</span>
            </span>
          </div>
          <div>
            <p className="eyebrow">SOLPLANET MONITOR</p>
            <h1>
              {setup ? t.setup : t.hello}
              <span className="accent">.</span>
            </h1>
            <p className="auth-subtitle">
              {setup
                ? t.setupText
                : lang === "hu"
                  ? "A napenergia minden fontos adata, egy helyen."
                  : "Your solar energy, clearly in view."}
            </p>
          </div>
          <div className="auth-ornament" aria-hidden="true">
            <Sun size={180} strokeWidth={0.7} />
          </div>
        </div>
        <div className="auth-form-wrap">
          <div className="lang-switch">
            <button
              onClick={() => setLanguage("hu")}
              className={lang === "hu" ? "active" : ""}
            >
              HU
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={lang === "en" ? "active" : ""}
            >
              EN
            </button>
          </div>
          <form className="auth-form" onSubmit={submitAuth}>
            <p className="eyebrow">{setup ? "01 / SETUP" : "01 / ACCESS"}</p>
            <h2>{setup ? t.setup : t.login}</h2>
            {setup && (
              <label>
                {t.name}
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
            )}
            <label>
              {t.email}
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              {t.password}
              <input
                required
                type="password"
                minLength={12}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? t.loading : setup ? t.add : t.login}
              <ArrowRight size={18} />
            </button>
            {!setup && oidcAvailable && (
              <button
                type="button"
                className="button subtle full"
                onClick={() =>
                  authClient.signIn.social({
                    provider: "oidc",
                    callbackURL: "/",
                  })
                }
              >
                {t.oidc}
                <ArrowRight size={18} />
              </button>
            )}
          </form>
        </div>
      </main>
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Sun size={22} />
          </span>
          <span>
            solaris<span className="brand-dot">.</span>
          </span>
        </div>
        <div className="sidebar-section">WORKSPACE</div>
        <button
          className={`nav-link ${panel === "none" ? "active" : ""}`}
          onClick={() => setPanel("none")}
        >
          <Activity size={19} />
          {t.overview}
        </button>
        <button
          className={`nav-link ${panel === "history" ? "active" : ""}`}
          onClick={() => setPanel("history")}
        >
          <Activity size={19} />
          {t.history}
        </button>
        <button
          className={`nav-link ${panel === "devices" ? "active" : ""}`}
          onClick={() => setPanel("devices")}
        >
          <Cpu size={19} />
          {t.devices}
        </button>
        {admin && (
          <button
            className={`nav-link ${panel === "settings" ? "active" : ""}`}
            onClick={() => {
              setPanel("settings");
              loadUsers();
              loadConfig();
            }}
          >
            <Settings2 size={19} />
            {t.settings}
          </button>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <span className="avatar">
              {pref?.user.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{pref?.user.name}</strong>
              <small>
                {admin ? t.admin : canManageDevices ? t.operator : t.viewer}
              </small>
            </div>
          </div>
          <button
            className="nav-link"
            onClick={async () => {
              await authClient.signOut();
              location.reload();
            }}
          >
            <LogOut size={18} />
            {t.logout}
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">
              <Sun size={20} />
            </span>
            <b>
              solaris<span className="brand-dot">.</span>
            </b>
          </div>
          <span className="breadcrumb">
            SOLARIS <span>/</span>{" "}
            {panel === "none"
              ? t.overview
              : panel === "history"
                ? t.history
                : panel === "devices"
                  ? t.devices
                  : t.settings}
          </span>
          <div className="top-actions">
            <button
              className="lang-pill"
              onClick={() => setLanguage(lang === "hu" ? "en" : "hu")}
            >
              <Globe2 size={16} />
              {lang.toUpperCase()}
            </button>
            <span className="user-pill">{pref?.user.name}</span>
          </div>
        </header>
        <main className="main-content">
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          )}
          {panel === "none" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    ENERGY OVERVIEW /{" "}
                    {new Date().toLocaleDateString(
                      lang === "hu" ? "hu-HU" : "en-US",
                    )}
                  </p>
                  <h1>
                    {t.overview}
                    <span className="accent">.</span>
                  </h1>
                  <p className="muted">
                    {current ? current.name : t.noDeviceText}
                  </p>
                </div>
                <div className="heading-actions">
                  {inverters.length > 1 && (
                    <select
                      aria-label={t.choose}
                      value={selected ?? ""}
                      onChange={(e) => setSelected(Number(e.target.value))}
                    >
                      {inverters.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    className="icon-button"
                    onClick={loadMetrics}
                    title={t.refresh}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
              {!current ? (
                <div className="empty-card">
                  <span className="empty-icon">
                    <Sun size={45} />
                  </span>
                  <h2>{t.noDevice}</h2>
                  <p>{t.noDeviceText}</p>
                  {canManageDevices && (
                    <button
                      className="button primary"
                      onClick={() => setPanel("devices")}
                    >
                      {t.addDevice}
                      <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="metric-grid">
                    <div className="hero-card">
                      <div className="card-top">
                        <span className="card-label">
                          <Zap size={17} />
                          {t.live}
                        </span>
                        <span
                          className={`status-pill ${online ? "online" : "offline"}`}
                        >
                          <span className="status-dot" />
                          {online ? t.online : t.offline}
                        </span>
                      </div>
                      <div className="hero-value">
                        {number(latest?.pac, 0, lang)}
                        <span>W</span>
                      </div>
                      <div className="hero-bottom">
                        <div className="hero-track">
                          <span
                            style={{
                              width: `${Math.min(100, ((latest?.pac ?? 0) / Math.max(peak, 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span>
                          {t.peak}: {number(peak, 0, lang)} W
                        </span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <span className="card-label">{t.today}</span>
                      <strong>
                        {number(stats?.daily ?? latest?.etd, 1, lang)}
                        <small>kWh</small>
                      </strong>
                      <span className="stat-foot">
                        {t.updated}:{" "}
                        {latest
                          ? new Date(latest.timestamp).toLocaleTimeString(
                              lang === "hu" ? "hu-HU" : "en-US",
                            )
                          : "—"}
                      </span>
                    </div>
                    <div className="stat-card">
                      <span className="card-label">{t.total}</span>
                      <strong>
                        {number(stats?.total ?? latest?.eto, 1, lang)}
                        <small>kWh</small>
                      </strong>
                      <span className="stat-foot">{current.serial_number}</span>
                    </div>
                  </div>
                  <div className="content-grid">
                    <section className="surface chart-surface">
                      <div className="section-heading">
                        <div>
                          <p className="eyebrow">LIVE DATA</p>
                          <h2>{t.production}</h2>
                        </div>
                        <span className="chip">W</span>
                      </div>
                      <div className="chart-wrap">
                        {chart.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={chart}
                              margin={{
                                top: 10,
                                right: 8,
                                bottom: 0,
                                left: -25,
                              }}
                            >
                              <CartesianGrid
                                stroke="#e7e9e5"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="time"
                                tick={{ fill: "#7b8580", fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={45}
                              />
                              <YAxis
                                tick={{ fill: "#7b8580", fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "#142522",
                                  color: "#fff",
                                  border: 0,
                                  borderRadius: 12,
                                }}
                                formatter={(value) => [
                                  `${number(Number(value), 0, lang)} W`,
                                  t.live,
                                ]}
                              />
                              <Area
                                type="monotone"
                                dataKey="power"
                                stroke="#de6a36"
                                strokeWidth={2.5}
                                fill="#de6a3622"
                                isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="chart-empty">{t.sample}</div>
                        )}
                      </div>
                    </section>
                    <section className="surface system-surface">
                      <div className="section-heading">
                        <div>
                          <p className="eyebrow">SYSTEM STATUS</p>
                          <h2>{t.status}</h2>
                        </div>
                        <Radio size={21} />
                      </div>
                      <div className="system-row">
                        <span className="system-symbol solar">
                          <Sun size={20} />
                        </span>
                        <span>{t.dc}</span>
                        <strong>
                          {number(
                            (latest?.vpv1 ?? 0) * (latest?.ipv1 ?? 0) +
                              (latest?.vpv2 ?? 0) * (latest?.ipv2 ?? 0) +
                              (latest?.vpv3 ?? 0) * (latest?.ipv3 ?? 0),
                            0,
                            lang,
                          )}{" "}
                          W
                        </strong>
                      </div>
                      <div className="system-row">
                        <span className="system-symbol">
                          <Cpu size={20} />
                        </span>
                        <span>Inverter</span>
                        <strong>{number(latest?.tmp, 1, lang)} °C</strong>
                      </div>
                      <div className="system-row">
                        <span className="system-symbol grid">
                          <Zap size={20} />
                        </span>
                        <span>{t.ac}</span>
                        <strong>{number(latest?.pac, 0, lang)} W</strong>
                      </div>
                      <div className="system-note">
                        <span className="status-dot" />
                        {latest?.err
                          ? `${t.fault}: ${latest.err}`
                          : latest?.wan
                            ? `${t.warning}: ${latest.wan}`
                            : online
                              ? t.online
                              : t.offline}
                      </div>
                    </section>
                  </div>
                  <div className="surface details-surface">
                    <button
                      className="details-toggle"
                      onClick={() => setAdvanced(!advanced)}
                    >
                      <span>
                        <CircleHelp size={20} />
                        {t.details}
                      </span>
                      <ChevronDown
                        size={19}
                        className={advanced ? "rotated" : ""}
                      />
                    </button>
                    {advanced && (
                      <div className="technical-grid">
                        <Technical
                          title={t.ac}
                          entries={[
                            [t.active, latest?.pac, "W"],
                            [t.apparent, latest?.sac, "VA"],
                            [t.reactive, latest?.qac, "var"],
                            [t.frequency, latest?.fac, "Hz"],
                            [t.powerFactor, latest?.pf, ""],
                            ["L1", latest?.vac1, "V"],
                            ["L2", latest?.vac2, "V"],
                            ["L3", latest?.vac3, "V"],
                            ["I1", latest?.iac1, "A"],
                            ["I2", latest?.iac2, "A"],
                            ["I3", latest?.iac3, "A"],
                          ]}
                          lang={lang}
                        />
                        <Technical
                          title={t.dc}
                          entries={[
                            ["PV1", latest?.vpv1, "V"],
                            ["PV1", latest?.ipv1, "A"],
                            ["PV2", latest?.vpv2, "V"],
                            ["PV2", latest?.ipv2, "A"],
                            ["PV3", latest?.vpv3, "V"],
                            ["PV3", latest?.ipv3, "A"],
                            [t.temperature, latest?.tmp, "°C"],
                            [t.operatingHours, latest?.hto, "h"],
                            ["Flag", latest?.flg, ""],
                            [t.warning, latest?.wan, ""],
                            [t.fault, latest?.err, ""],
                          ]}
                          lang={lang}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          {panel === "history" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ENERGY ANALYTICS</p>
                  <h1>
                    {t.history}
                    <span className="accent">.</span>
                  </h1>
                  <p className="muted">{current?.name || t.noDevice}</p>
                </div>
                <div className="heading-actions">
                  {inverters.length > 1 && (
                    <select
                      aria-label={t.choose}
                      value={selected ?? ""}
                      onChange={(e) => setSelected(Number(e.target.value))}
                    >
                      {inverters.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    className="icon-button"
                    title={t.refresh}
                    onClick={loadHistorical}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
              <div className="history-controls">
                <div className="segmented">
                  {(["today", "7d", "30d"] as const).map((range) => (
                    <button
                      key={range}
                      className={historyRange === range ? "active" : ""}
                      onClick={() => {
                        setHistorical([]);
                        setHistoryRange(range);
                      }}
                    >
                      {range === "today"
                        ? t.today
                        : range === "7d"
                          ? t.last7
                          : t.last30}
                    </button>
                  ))}
                </div>
                <select
                  aria-label={t.details}
                  value={historyMetric}
                  onChange={(e) => {
                    setHistorical([]);
                    setHistoryMetric(e.target.value as typeof historyMetric);
                  }}
                >
                  <option value="power">{t.active} (W)</option>
                  <option value="voltage">{t.gridVoltage} (V)</option>
                  <option value="frequency">{t.frequency} (Hz)</option>
                  <option value="temperature">{t.temperature} (°C)</option>
                </select>
              </div>
              <div className="history-stats">
                <div className="stat-card">
                  <span className="card-label">{t.minimum}</span>
                  <strong>
                    {number(
                      historyValues.length
                        ? Math.min(...historyValues)
                        : undefined,
                      1,
                      lang,
                    )}
                    <small>{historyUnit}</small>
                  </strong>
                </div>
                <div className="stat-card">
                  <span className="card-label">{t.average}</span>
                  <strong>
                    {number(
                      historyValues.length
                        ? historyValues.reduce((sum, value) => sum + value, 0) /
                            historyValues.length
                        : undefined,
                      1,
                      lang,
                    )}
                    <small>{historyUnit}</small>
                  </strong>
                </div>
                <div className="stat-card">
                  <span className="card-label">{t.maximum}</span>
                  <strong>
                    {number(
                      historyValues.length
                        ? Math.max(...historyValues)
                        : undefined,
                      1,
                      lang,
                    )}
                    <small>{historyUnit}</small>
                  </strong>
                </div>
              </div>
              <section className="surface history-chart">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">HISTORICAL DATA</p>
                    <h2>
                      {historyMetric === "power"
                        ? t.active
                        : historyMetric === "voltage"
                          ? t.gridVoltage
                          : historyMetric === "frequency"
                            ? t.frequency
                            : t.temperature}
                    </h2>
                  </div>
                  <span className="chip">{historyUnit}</span>
                </div>
                <div className="chart-wrap">
                  {historyChart.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={historyChart}
                        margin={{ top: 12, right: 10, bottom: 0, left: -18 }}
                      >
                        <CartesianGrid stroke="#e7e9e5" vertical={false} />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: "#7b8580", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={55}
                        />
                        <YAxis
                          tick={{ fill: "#7b8580", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          domain={
                            historyMetric === "power"
                              ? [0, "auto"]
                              : ["dataMin - 1", "dataMax + 1"]
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#142522",
                            color: "#fff",
                            border: 0,
                            borderRadius: 12,
                          }}
                          formatter={(value) => [
                            `${number(Number(value), 1, lang)} ${historyUnit}`,
                            t.history,
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#de6a36"
                          strokeWidth={2.5}
                          fill="#de6a3622"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">{t.noHistory}</div>
                  )}
                </div>
              </section>
            </>
          )}
          {panel === "devices" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">DEVICE MANAGEMENT</p>
                  <h1>
                    {t.devices}
                    <span className="accent">.</span>
                  </h1>
                </div>
              </div>
              <div className="device-list">
                {inverters.map((item) => (
                  <div className="device-row" key={item.id}>
                    <span className="system-symbol solar">
                      <Cpu size={21} />
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.serial_number} · {item.ip_address}:{item.port}
                      </small>
                    </div>
                    <span className="chip">
                      {item.id === selected
                        ? online
                          ? t.online
                          : t.offline
                        : t.status}
                    </span>
                    {canManageDevices && (
                      <button
                        className="icon-button danger"
                        title="Delete"
                        onClick={async () => {
                          await api(`/api/v1/inverters/${item.id}`, {
                            method: "DELETE",
                          });
                          await load();
                        }}
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {canManageDevices && (
                <div className="two-panel">
                  <section className="surface form-surface">
                    <p className="eyebrow">MANUAL</p>
                    <h2>{t.addDevice}</h2>
                    <form onSubmit={saveDevice}>
                      <label>
                        {t.name}
                        <input
                          required
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        {t.serial}
                        <input
                          required
                          value={form.serial_number}
                          onChange={(e) =>
                            setForm({ ...form, serial_number: e.target.value })
                          }
                        />
                      </label>
                      <div className="form-row">
                        <label>
                          {t.address}
                          <input
                            required
                            value={form.ip_address}
                            placeholder="192.168.1.15"
                            onChange={(e) =>
                              setForm({ ...form, ip_address: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Port
                          <input
                            type="number"
                            min="1"
                            max="65535"
                            value={form.port}
                            onChange={(e) =>
                              setForm({ ...form, port: Number(e.target.value) })
                            }
                          />
                        </label>
                      </div>
                      <button className="button primary" disabled={busy}>
                        {t.add}
                        <Plus size={17} />
                      </button>
                    </form>
                  </section>
                  <section className="surface form-surface">
                    <p className="eyebrow">LOCAL NETWORK</p>
                    <h2>{t.scan}</h2>
                    <label>
                      {t.subnet}
                      <input
                        value={config.discovery_subnet}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            discovery_subnet: e.target.value,
                          })
                        }
                        placeholder="192.168.1.0/24"
                      />
                    </label>
                    <button
                      className="button secondary"
                      onClick={scan}
                      disabled={busy}
                    >
                      <Search size={18} />
                      {busy ? t.scanning : t.scan}
                    </button>
                    <div className="scan-results">
                      {discovered.map((item) => (
                        <button
                          key={`${item.ip_address}-${item.serial_number}`}
                          onClick={() =>
                            setForm({
                              ...form,
                              name: item.model || item.serial_number,
                              serial_number: item.serial_number,
                              ip_address: item.ip_address,
                              port: item.port,
                            })
                          }
                        >
                          <span>
                            <strong>{item.model || item.serial_number}</strong>
                            <small>
                              {item.serial_number} · {item.ip_address}
                            </small>
                          </span>
                          <ArrowRight size={17} />
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
          {panel === "settings" && admin && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ADMINISTRATION</p>
                  <h1>
                    {t.settings}
                    <span className="accent">.</span>
                  </h1>
                </div>
              </div>
              <div className="two-panel">
                <section className="surface form-surface">
                  <p className="eyebrow">GENERAL</p>
                  <h2>{t.settings}</h2>
                  <form onSubmit={saveConfig}>
                    <label>
                      {t.defaultLang}
                      <select
                        value={config.default_language}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            default_language: e.target.value,
                          })
                        }
                      >
                        <option value="hu">Magyar</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                    <label>
                      {t.subnet}
                      <input
                        value={config.discovery_subnet}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            discovery_subnet: e.target.value,
                          })
                        }
                      />
                    </label>
                    <p className="eyebrow top-space">{t.oidc}</p>
                    <label>
                      {t.name}
                      <input
                        value={config.oidc_name}
                        onChange={(e) =>
                          setConfig({ ...config, oidc_name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      {t.discovery}
                      <input
                        type="url"
                        placeholder="https://…/.well-known/openid-configuration"
                        value={config.oidc_discovery_url}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            oidc_discovery_url: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      {t.clientId}
                      <input
                        value={config.oidc_client_id}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            oidc_client_id: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      {t.clientSecret}
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={config.oidc_client_secret}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            oidc_client_secret: e.target.value,
                          })
                        }
                      />
                    </label>
                    <button className="button primary" disabled={busy}>
                      {t.save}
                      <ArrowRight size={17} />
                    </button>
                  </form>
                </section>
                <section className="surface form-surface">
                  <p className="eyebrow">ACCESS CONTROL</p>
                  <h2>{t.users}</h2>
                  <div className="user-list">
                    {users.map((user) => (
                      <div className="user-row" key={user.id}>
                        <span className="avatar">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </div>
                        <select
                          aria-label={t.role}
                          value={user.role}
                          onChange={(e) => changeRole(user.id, e.target.value)}
                        >
                          <option value="viewer">{t.viewer}</option>
                          <option value="operator">{t.operator}</option>
                          <option value="admin">{t.admin}</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={addUser}>
                    <p className="eyebrow top-space">{t.addUser}</p>
                    <label>
                      {t.name}
                      <input
                        required
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      {t.email}
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      {t.password}
                      <input
                        required
                        type="password"
                        minLength={12}
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                      />
                    </label>
                    <button className="button secondary" disabled={busy}>
                      <Plus size={17} />
                      {t.addUser}
                    </button>
                  </form>
                </section>
              </div>
            </>
          )}
        </main>
        <nav className="mobile-nav">
          <button
            onClick={() => setPanel("none")}
            className={panel === "none" ? "active" : ""}
          >
            <Activity size={21} />
            <span>{t.overview}</span>
          </button>
          <button
            onClick={() => setPanel("history")}
            className={panel === "history" ? "active" : ""}
          >
            <Activity size={21} />
            <span>{t.history}</span>
          </button>
          <button
            onClick={() => setPanel("devices")}
            className={panel === "devices" ? "active" : ""}
          >
            <Cpu size={21} />
            <span>{t.devices}</span>
          </button>
          {admin && (
            <button
              onClick={() => {
                setPanel("settings");
                loadUsers();
                loadConfig();
              }}
              className={panel === "settings" ? "active" : ""}
            >
              <Settings2 size={21} />
              <span>{t.settings}</span>
            </button>
          )}
          <button
            onClick={async () => {
              await authClient.signOut();
              location.reload();
            }}
          >
            <LogOut size={21} />
            <span>{t.logout}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

function Technical({
  title,
  entries,
  lang,
}: {
  title: string;
  entries: [string, number | undefined, string][];
  lang: Lang;
}) {
  return (
    <div>
      <h3>{title}</h3>
      {entries.map(([label, value, unit], index) => (
        <div className="technical-row" key={`${label}-${index}`}>
          <span>{label}</span>
          <strong>
            {number(value, 2, lang)} {unit}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return <SolarisApp />;
}
