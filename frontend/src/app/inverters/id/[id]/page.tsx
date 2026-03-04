"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface Metric {
  id: number;
  inverter_id: number;
  timestamp: string;
  pac: number; // Active AC Power (W)
  etd: number; // Today's Energy Output (Wh)
  eto: number; // Total Energy Output (Wh)
  tmp: number; // Temperature
  fac: number; // AC Frequency
  vac1: number; // AC Voltage Phase 1
  iac1: number; // AC Current Phase 1
  vpv1: number; // PV Voltage String 1
  ipv1: number; // PV Current String 1
  // Add other fields as needed
}

interface Inverter {
  id: number;
  name: string;
  serial_number: string;
}

export default function InverterDetailPage() {
  const params = useParams();
  const inverterId = params.id as string;
  const [inverter, setInverter] = useState<Inverter | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('24h'); // '24h', '7d', '30d'

  useEffect(() => {
    const fetchInverterAndMetrics = async () => {
      try {
        setLoading(true);
        setError('');

        const fetchedInverter = await api.get(`/inverters/${inverterId}`);
        setInverter(fetchedInverter);

        let startDate: Date | undefined;
        let limit = 100; // Default limit

        if (timeRange === '24h') {
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          limit = 1440; // Max 1440 minutes in 24 hours
        } else if (timeRange === '7d') {
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          limit = 7 * 24 * 60; // Max metrics for 7 days
        } else if (timeRange === '30d') {
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          limit = 30 * 24 * 60; // Max metrics for 30 days
        }

        const fetchedMetrics = await api.get(
          `/metrics?inverter_id=${inverterId}&start_time=${startDate?.toISOString() || ''}&limit=${limit}`
        );
        setMetrics(fetchedMetrics.reverse()); // Reverse to show oldest first
      } catch (err: any) {
        setError('Failed to fetch inverter details or metrics.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (inverterId) {
      fetchInverterAndMetrics();
    }
  }, [inverterId, timeRange]);

  if (loading) {
    return <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">Loading inverter data...</div>;
  }

  if (error) {
    return <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 text-red-500">{error}</div>;
  }

  if (!inverter) {
    return <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">Inverter not found.</div>;
  }

  const latestMetric = metrics[metrics.length - 1]; // Get the very last metric for current values

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Inverter: {inverter.name} ({inverter.serial_number})</h1>

        <div className="flex space-x-4 mb-6">
          <button onClick={() => setTimeRange('24h')} className={`px-4 py-2 rounded-md ${timeRange === '24h' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>Last 24h</button>
          <button onClick={() => setTimeRange('7d')} className={`px-4 py-2 rounded-md ${timeRange === '7d' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>Last 7 Days</button>
          <button onClick={() => setTimeRange('30d')} className={`px-4 py-2 rounded-md ${timeRange === '30d' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>Last 30 Days</button>
        </div>

        {latestMetric && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Current Power</h2>
              <p className="text-4xl font-bold text-indigo-600 mt-2">{latestMetric.pac} W</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Today's Yield</h2>
              <p className="text-4xl font-bold text-green-600 mt-2">{latestMetric.etd} Wh</p>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Yield</h2>
              <p className="text-4xl font-bold text-yellow-600 mt-2">{latestMetric.eto} Wh</p>
            </div>
          </div>
        )}

        {metrics.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Power Output</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                  <XAxis dataKey="timestamp" tickFormatter={(tick) => format(new Date(tick), 'HH:mm')} stroke="#CBD5E0" />
                  <YAxis stroke="#CBD5E0" />
                  <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none' }} itemStyle={{ color: '#E2E8F0' }} labelStyle={{ color: '#A0AEC0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="pac" stroke="#8884d8" name="Active Power (W)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Voltages (AC & PV)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                  <XAxis dataKey="timestamp" tickFormatter={(tick) => format(new Date(tick), 'HH:mm')} stroke="#CBD5E0" />
                  <YAxis stroke="#CBD5E0" />
                  <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none' }} itemStyle={{ color: '#E2E8F0' }} labelStyle={{ color: '#A0AEC0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="vac1" stroke="#FFC658" name="AC Voltage 1 (V)" />
                  <Line type="monotone" dataKey="vpv1" stroke="#82ca9d" name="PV Voltage 1 (V)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Currents (AC & PV)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                  <XAxis dataKey="timestamp" tickFormatter={(tick) => format(new Date(tick), 'HH:mm')} stroke="#CBD5E0" />
                  <YAxis stroke="#CBD5E0" />
                  <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none' }} itemStyle={{ color: '#E2E8F0' }} labelStyle={{ color: '#A0AEC0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="iac1" stroke="#FF7300" name="AC Current 1 (A)" />
                  <Line type="monotone" dataKey="ipv1" stroke="#00C49F" name="PV Current 1 (A)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Temperature & Frequency</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                  <XAxis dataKey="timestamp" tickFormatter={(tick) => format(new Date(tick), 'HH:mm')} stroke="#CBD5E0" />
                  <YAxis yAxisId="left" stroke="#CBD5E0" />
                  <YAxis yAxisId="right" orientation="right" stroke="#CBD5E0" />
                  <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none' }} itemStyle={{ color: '#E2E8F0' }} labelStyle={{ color: '#A0AEC0' }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="tmp" stroke="#82ca9d" name="Temperature (°C)" />
                  <Line yAxisId="right" type="monotone" dataKey="fac" stroke="#FFBB28" name="Frequency (Hz)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
