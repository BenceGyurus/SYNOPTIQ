"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface InverterData {
  id: number;
  timestamp: string;
  inverter_sn: string;
  flg: number;
  tim: string;
  tmp: number;
  fac: number;
  pac: number;
  sac: number;
  qac: number;
  eto: number;
  etd: number;
  hto: number;
  pf: number;
  wan: number;
  err: number;
  vac1: number | null;
  vac2: number | null;
  vac3: number | null;
  iac1: number | null;
  iac2: number | null;
  iac3: number | null;
  vpv1: number | null;
  vpv2: number | null;
  ipv1: number | null;
  ipv2: number | null;
}

export default function InverterDataPage({ params }: { params: { sn: string } }) {
  const { sn } = params;
  const [data, setData] = useState<InverterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sn) return;

    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:8000/data/latest/${sn}`);
        if (!res.ok) {
          throw new Error("Failed to fetch inverter data");
        }
        const jsonData = await res.json();
        setData(jsonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sn]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data) {
    return <div>No data available for this inverter.</div>;
  }

  return (
    <div>
      <h1>
        Latest Data for Inverter: {sn}
      </h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <Link href="/inverters">Back to Inverters</Link>
    </div>
  );
}
