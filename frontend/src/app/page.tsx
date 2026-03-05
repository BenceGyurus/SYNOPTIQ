"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sun, Moon, Home as HomeIcon, Zap, Battery, Leaf, ShieldCheck, Activity, Cpu, Info, BarChart3, Clock, Settings, Terminal, AlertTriangle, CheckCircle2, TrendingUp, LogOut } from 'lucide-react';
import { getTranslation } from '@/lib/translations';

interface Inverter {
  id: number;
  name: string;
  serial_number: string;
  ip_address: string;
  port: number;
}

interface Metric {
  id: number;
  timestamp: string;
  pac: number; etd: number; eto: number;
  vpv1: number; vpv2: number; ipv1: number; ipv2: number;
  vac1: number; vac2: number; vac3: number;
  tmp: number; fac: number; hto: number;
}

interface Stats {
  daily: number; monthly: number; yearly: number; yesterday: number; total: number;
  co2_saved: number; trees_equivalent: number; efficiency: number;
  savings_huf: number;
}

interface LogEntry {
  id: string;
  time: string;
  msg: string;
  type: 'info' | 'warn' | 'success' | 'system';
}

export default function Home() {
  const t = useMemo(() => getTranslation(process.env.NEXT_PUBLIC_LANGUAGE), []);
  const [inverter, setInverter] = useState<Inverter | null>(null);
  const [latest, setLatest] = useState<Metric | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<Metric[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [viewMode, setViewMode] = useState<'today' | 'yesterday'>('today');
  const [chartMetric, setChartMetric] = useState<'pac' | 'vac1' | 'fac'>('pac');
  const [dataLoading, setDataLoading] = useState(true);
  const [isNight, setIsNight] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [{ id, time, msg, type }, ...prev].slice(0, 50));
  };

  const dailyPeak = useMemo(() => {
    if (chartData.length === 0) return { val: 0, time: '--:--' };
    const peak = [...chartData].sort((a, b) => b.pac - a.pac)[0];
    return {
      val: peak.pac,
      time: new Date(peak.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }, [chartData]);

  const isOnline = useMemo(() => {
    if (!latest?.timestamp) return false;
    return (new Date().getTime() - new Date(latest.timestamp).getTime()) < 5 * 60 * 1000;
  }, [latest]);

  const anomalies = useMemo(() => {
    const list = [];
    if (latest) {
      if (latest.vac1 > 253 || latest.vac2 > 253 || latest.vac3 > 253) 
        list.push(t.critical_grid);
      const p1 = latest.vpv1 * latest.ipv1;
      const p2 = latest.vpv2 * latest.ipv2;
      if (p1 > 500 && p2 > 500 && Math.abs(p1 - p2) / Math.max(p1, p2) > 0.3)
        list.push(t.string_diff);
      if (latest.tmp > 75)
        list.push(t.overheating);
    }
    return list;
  }, [latest, t]);

  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsNight(hour >= 19 || hour < 6);
    };
    checkTime();
    
    const fetchData = async () => {
      try {
        const inverters = await api.get('/inverters');
        if (inverters.length > 0) {
          const inv = inverters[0];
          setInverter(inv);
          const id = inv.id;
          const [l, s] = await Promise.all([
            api.get(`/metrics/latest?inverter_id=${id}`),
            api.get(`/metrics/stats?inverter_id=${id}`)
          ]);
          
          if (!latest || l.id !== latest.id) {
            if (l.pac > 0 && (!latest || latest.pac === 0)) addLog(`${t.production_started}: ${l.pac}W`, 'success');
          }

          setLatest(l);
          setStats(s);
          await fetchHistory(id, viewMode);
        }
      } catch (e) { 
        console.error(e);
        addLog(t.error_sync, "warn");
      }
      finally { setDataLoading(false); }
    };

    fetchData();
    const inv = setInterval(fetchData, 10000);
    return () => clearInterval(inv);
  }, [viewMode, t]);

  useEffect(() => {
    if (anomalies.length > 0) {
      anomalies.forEach(a => addLog(a, 'warn'));
    }
  }, [anomalies]);

  const fetchHistory = async (inverterId: number, mode: 'today' | 'yesterday') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    if (mode === 'today') start.setHours(0, 0, 0, 0);
    else {
      start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1); end.setHours(23, 59, 59, 999);
    }
    try {
      const h = await api.get(`/metrics?inverter_id=${inverterId}&start_time=${start.toISOString()}&end_time=${end.toISOString()}&limit=1000`);
      setChartData(h.reverse());
    } catch (e) { console.error(e); }
  };

  const string1Power = useMemo(() => (latest?.vpv1 || 0) * (latest?.ipv1 || 0), [latest]);
  const string2Power = useMemo(() => (latest?.vpv2 || 0) * (latest?.ipv2 || 0), [latest]);
  const dailyDiff = useMemo(() => stats ? ((stats.daily - stats.yesterday) / (stats.yesterday || 1)) * 100 : 0, [stats]);
  const getFlowSpeed = (pwr: number) => (!isOnline || pwr <= 5) ? '0s' : `${Math.max(0.2, 2 - (pwr / 2000))}s`;

  if (dataLoading) return (
    <div className="flex h-screen items-center justify-center bg-[#020617]">
      <div className="flex flex-col items-center gap-6">
        <Sun className="w-16 h-16 text-yellow-500 animate-spin" />
        <span className="text-yellow-500/50 font-mono tracking-[0.5em] text-[10px] uppercase animate-pulse">{t.initializing}</span>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen p-4 md:p-8 space-y-6 max-w-[1800px] mx-auto">
      {/* HEADER HUD */}
      <header className="flex flex-col lg:flex-row justify-between items-center glass-advanced px-8 py-6 gap-6">
        <div className="flex items-center gap-6 w-full lg:w-auto">
          <div className={`p-4 rounded-2xl shadow-2xl ${isNight ? 'bg-blue-600/20 ring-1 ring-blue-500/50' : 'bg-yellow-500/20 ring-1 ring-yellow-500/50'}`}>
            {isNight ? <Moon className="w-8 h-8 text-blue-400" /> : <Sun className="w-8 h-8 text-yellow-500" />}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{t.dashboard_title}</h1>
              <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isOnline ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
                {isOnline ? 'Active_Link' : 'Link_Lost'}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.uptime}: {Math.floor((latest?.hto || 0)/24)}d {(latest?.hto || 0)%24}h</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-6 lg:gap-8">
          <Link href="/history">
            <button className="flex flex-col items-center group">
              <BarChart3 className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black text-slate-500 uppercase mt-1">{t.analysis_btn}</span>
            </button>
          </Link>
          <div className="w-px h-8 bg-white/10 hidden sm:block" />
          <div className="text-center">
            <div className="text-[9px] font-black text-slate-500 uppercase mb-1">{t.daily_peak}</div>
            <div className="text-xl font-black text-white">{dailyPeak.val.toFixed(0)}<span className="text-xs text-slate-500 ml-1">W</span></div>
            <div className="text-[9px] font-bold text-yellow-500/50">{dailyPeak.time}</div>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block" />
          <div className="text-center">
            <div className="text-[9px] font-black text-slate-500 uppercase mb-1">{t.savings}</div>
            <div className="text-xl font-black text-green-500">{stats?.total.toFixed(1)}<span className="text-xs ml-1">kWh</span></div>
            <div className="text-[9px] font-bold text-green-500/50">{t.total}</div>
          </div>
        </div>
      </header>

      {/* Stats row for daily energy */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="glass-advanced flex-1 p-4 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{t.daily_energy}</span>
          <span className="text-xl font-black text-yellow-500">{stats?.daily.toFixed(2)} kWh</span>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="glass-advanced p-6 lg:p-12 relative overflow-hidden flex items-center justify-center min-h-[450px] lg:min-h-[550px]">
            <div className="absolute top-6 left-8 flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">{t.telemetry_engine}</span>
            </div>
            
            <div className="relative w-full max-w-5xl">
              <svg viewBox="0 0 1000 500" className="w-full h-auto overflow-visible drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <g className="sun-core transition-all duration-1000" style={{ transform: `translate(0, ${isNight ? '20px' : '0'})` }}>
                  <circle cx="500" cy="50" r="40" fill={isNight ? "#3b82f6" : "#fbbf24"} fillOpacity={isNight ? 0.8 : 1} />
                  <circle cx="500" cy="50" r="80" fill={isNight ? "#3b82f6" : "#fbbf24"} fillOpacity={0.05} />
                  {isNight && <circle cx="525" cy="35" r="35" fill="#020617" />}
                </g>

                {[
                  { id: 'ALPHA', y: 150, pwr: string1Power, v: latest?.vpv1, i: latest?.ipv1, color: '#00f3ff' },
                  { id: 'BETA', y: 320, pwr: string2Power, v: latest?.vpv2, i: latest?.ipv2, color: '#ff00ea' }
                ].map(s => (
                  <g key={s.id} className="float-animation" style={{ animationDelay: s.id === 'BETA' ? '1s' : '0s' }}>
                    <rect x="80" y={s.y} width="240" height="120" rx="20" fill="rgba(15,23,42,0.8)" stroke={s.color} strokeWidth="1" strokeOpacity="0.3" />
                    <text x="100" y={s.y - 15} fill={s.color} className="text-[10px] font-black tracking-[0.2em] opacity-50">{t.pv_array}_{s.id}</text>
                    <text x="105" y={s.y + 45} fill="white" className="text-[32px] font-black tracking-tighter">{s.pwr.toFixed(0)}W</text>
                    <text x="105" y={s.y + 75} fill={s.color} className="text-[12px] font-mono font-bold opacity-80">{(s.v || 0).toFixed(1)}V | {(s.i || 0).toFixed(1)}A</text>
                    <path d={`M320 ${s.y+60}C400 ${s.y+60} 400 300 450 300`} className="particle-path" stroke={s.color} strokeWidth="3" fill="none" style={{ '--flow-speed': getFlowSpeed(s.pwr) } as any} />
                  </g>
                ))}

                <g transform="translate(450, 230)">
                  <rect width="140" height="140" rx="35" fill="rgba(30,41,59,0.9)" stroke="white" strokeOpacity="0.1" />
                  <Zap x="40" y="35" width="60" height="60" className={isOnline && latest?.pac && latest.pac > 0 ? "text-yellow-500" : "text-slate-700"} />
                </g>

                <path d="M590 300H800" className="particle-path" stroke="#4ade80" strokeWidth="5" fill="none" style={{ '--flow-speed': getFlowSpeed(latest?.pac || 0) } as any} />

                <g transform="translate(810, 230)">
                  <rect width="140" height="140" rx="35" fill="rgba(15,23,42,0.8)" stroke="#4ade80" strokeWidth="1" strokeOpacity="0.2" />
                  <HomeIcon x="40" y="35" width="60" height="60" className="text-green-500 opacity-80" />
                  <text x="70" y="125" textAnchor="middle" fill="white" className="text-[24px] font-black tracking-tighter">{latest?.pac || 0}W</text>
                </g>
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: t.daily_yield, val: (stats?.daily || 0) / 1000, unit: 'kWh', icon: Zap, color: 'text-yellow-500', trend: dailyDiff },
              { label: t.savings, val: stats?.savings_huf || 0, unit: 'Ft', icon: TrendingUp, color: 'text-green-500' },
              { label: t.co2_saved, val: stats?.co2_saved || 0, unit: 'kg', icon: Leaf, color: 'text-green-500' },
              { label: t.efficiency, val: stats?.efficiency || 0, unit: '%', icon: ShieldCheck, color: 'text-cyan-500' },
              { label: t.temp, val: latest?.tmp || 0, unit: '°C', icon: Activity, color: 'text-red-500' },
            ].map((item, i) => (
              <div key={i} className="glass-advanced p-5 hover:translate-y-[-4px] transition-all">
                <div className="flex justify-between items-center mb-3">
                  <div className="p-1.5 rounded-lg bg-white/5"><item.icon className={`w-4 h-4 ${item.color}`} /></div>
                  {item.trend !== undefined && (
                    <div className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${item.trend >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {item.trend >= 0 ? '▲' : '▼'} {Math.abs(item.trend).toFixed(1)}%
                    </div>
                  )}
                </div>
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.label}</div>
                <div className="text-xl font-black text-white">{item.val.toLocaleString(undefined, {maximumFractionDigits: 2})}<span className="text-[10px] ml-1 text-slate-600">{item.unit}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="glass-advanced p-6 flex-1 border-red-500/20">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">{t.anomalies}</h3>
            </div>
            <div className="space-y-4">
              {anomalies.length > 0 ? anomalies.map((a, i) => (
                <div key={i} className="flex gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-[10px] font-black text-red-400 uppercase leading-tight">{a}</span>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-8 opacity-20">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{t.stable}</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-advanced p-6 flex-1 flex flex-col min-h-[300px] border-blue-500/20">
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
              <Terminal className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">{t.system_log}</h3>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[9px] space-y-2 custom-scrollbar pr-2">
              {logs.map(log => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-slate-600">[{log.time}]</span>
                  <span className={
                    log.type === 'success' ? 'text-green-500' :
                    log.type === 'warn' ? 'text-red-500' :
                    log.type === 'system' ? 'text-blue-400' : 'text-slate-400'
                  }>
                    {log.msg}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-advanced p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">{t.analysis_title}</h3>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                {['today', 'yesterday'].map(m => (
                  <button key={m} onClick={() => setViewMode(m as any)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${viewMode === m ? 'bg-yellow-500 text-black' : 'text-slate-500 hover:text-white'}`}>
                    {m === 'today' ? t.today_data : t.yesterday_data}
                  </button>
                ))}
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                {['pac', 'vac1', 'fac'].map(m => (
                  <button key={m} onClick={() => setChartMetric(m as any)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${chartMetric === m ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-white'}`}>
                    {m === 'pac' ? t.watt : m === 'vac1' ? t.volt : t.hertz}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-[350px] md:h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.map(m => ({ ...m, time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))}>
              <defs>
                <linearGradient id="waveformColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartMetric === 'pac' ? (isNight ? "#3b82f6" : "#fbbf24") : "#8b5cf6"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartMetric === 'pac' ? (isNight ? "#3b82f6" : "#fbbf24") : "#8b5cf6"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
              <XAxis dataKey="time" stroke="#334155" fontSize={9} fontWeight="black" tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis stroke="#334155" fontSize={9} fontWeight="black" tickLine={false} axisLine={false} domain={chartMetric === 'fac' ? [49, 51] : chartMetric === 'vac1' ? [210, 250] : ['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.25rem' }}
                itemStyle={{ color: '#fbbf24', fontSize: '12px', fontWeight: '900' }}
              />
              <Area type="monotone" dataKey={chartMetric} stroke={chartMetric === 'pac' ? (isNight ? "#3b82f6" : "#fbbf24") : "#8b5cf6"} strokeWidth={4} fillOpacity={1} fill="url(#waveformColor)" animationDuration={2000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <footer className="flex flex-col md:flex-row justify-between items-center glass-advanced px-8 py-4 opacity-40 hover:opacity-100 transition-opacity gap-4">
        <div className="flex items-center gap-3 text-slate-500">
          <Info className="w-4 h-4 text-blue-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t.node_serial}: {inverter?.serial_number || '---'}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <Clock className="w-4 h-4 text-yellow-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t.sync_cycle}: 5000ms // {t.last_sync}: {latest?.timestamp ? new Date(latest.timestamp).toLocaleString() : '--'}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <Settings className="w-4 h-4 text-purple-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t.infrastructure}: {inverter?.ip_address || '---'}:{inverter?.port || '8484'}</span>
        </div>
      </footer>
    </main>
  );
}
