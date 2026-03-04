"use client";

import { useEffect, useState } from "react";

interface Inverter {
  ip: string;
  sn: string;
  device: number;
}

export default function InvertersPage() {
  const [inverters, setInverters] = useState<Inverter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInverters() {
      try {
        const res = await fetch("http://localhost:8000/inverters");
        if (!res.ok) {
          throw new Error("Failed to fetch inverters");
        }
        const data = await res.json();
        setInverters(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchInverters();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Inverters</h1>
      <ul>
        {inverters.map((inverter) => (
          <li key={inverter.sn}>
            <a href={`/inverters/${inverter.sn}`}>
              {inverter.sn} ({inverter.ip})
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
