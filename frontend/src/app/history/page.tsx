"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Calendar, Zap, TrendingUp, BarChart3, Clock, Download } from 'lucide-react';

interface Metric {
  id: number;
  timestamp: string;
  pac: number;
  etd: number;
  vpv1: number;
  vac1: number;
}

export default function HistoryPage() {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, peak: 0, avg: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const inverters = await api.get('/inverters');
      if (inverters.length > 0) {
        const id = inverters[0].id;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const h = await api.get(`/metrics?inverter_id=${id}&start_time=${start.toISOString()}&end_time=${end.toISOString()}&limit=5000`);
        const reversed = h.reverse();
        
        // Számítások
        let total = 0;
        let peak = 0;
        if (reversed.length > 0) {
          peak = Math.max(...reversed.map((m: Metric) => m.pac));
          // Termelés becslése az etd-kből (utolsó - első nap különbsége vagy napi maxok összege)
          // Itt az egyszerűség kedvéért a pac-ból integrálunk vagy az eto-t nézzük
          const firstEto = reversed[0].eto || 0;
          const lastEto = reversed[reversed.length - 1].eto || 0;
          total = (lastEto - firstEto) / 1000;
        }

        setData(reversed);
        setStats({
          total: total > 0 ? total : 0,
          peak: peak,
          avg: reversed.length > 0 ? reversed.reduce((acc: number, curr: Metric) => acc + curr.pac, 0) / reversed.length : 0
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-advanced px-8 py-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 hover:bg-white/5 rounded-xl transition-all">
              <ArrowLeft className="w-6 h-6 text-yellow-500" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Időszaki Analízis</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Egyedi intervallum lekérdezése</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[#020617] rounded-xl border border-white/10 p-1">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[10px] font-black text-white px-3 py-1.5 focus:outline-none"
            />
            <span className="text-slate-600 px-1">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[10px] font-black text-white px-3 py-1.5 focus:outline-none"
            />
          </div>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="px-6 py-2 bg-yellow-500 text-black font-black text-[10px] rounded-xl hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-all disabled:opacity-50"
          >
            {loading ? 'BETÖLTÉS...' : 'LEKÉRDEZÉS'}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-advanced p-6 border-yellow-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/10 rounded-lg"><Zap className="w-5 h-5 text-yellow-500" /></div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Időszaki termelés</h3>
          </div>
          <p className="text-3xl font-black text-white">{stats.total.toFixed(2)} <span className="text-sm text-slate-600">kWh</span></p>
        </div>
        <div className="glass-advanced p-6 border-blue-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-500" /></div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Csúcsteljesítmény</h3>
          </div>
          <p className="text-3xl font-black text-white">{stats.peak.toFixed(0)} <span className="text-sm text-slate-600">W</span></p>
        </div>
        <div className="glass-advanced p-6 border-green-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg"><Clock className="w-5 h-5 text-green-500" /></div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Adatpontok száma</h3>
          </div>
          <p className="text-3xl font-black text-white">{data.length} <span className="text-sm text-slate-600">db</span></p>
        </div>
      </div>

      {/* Detailed Chart */}
      <div className="glass-advanced p-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-black text-white uppercase tracking-widest">Termelési Görbe</h3>
          <BarChart3 className="w-5 h-5 text-slate-700" />
        </div>
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.map(m => ({ ...m, time: new Date(m.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }))}>
              <defs>
                <linearGradient id="historyGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
              <XAxis dataKey="time" stroke="#334155" fontSize={9} fontWeight="black" tickLine={false} axisLine={false} minTickGap={100} />
              <YAxis stroke="#334155" fontSize={9} fontWeight="black" tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.25rem' }}
                itemStyle={{ color: '#fbbf24', fontSize: '12px', fontWeight: '900' }}
              />
              <Area type="monotone" dataKey="pac" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#historyGold)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}
