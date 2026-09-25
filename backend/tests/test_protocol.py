import asyncio
import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("INTERNAL_API_SECRET", "test-only-secret")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.discovery import discover_inverters
from app.services.inverter_data_collector import parse_inverter_data
from fastapi import HTTPException


class ProtocolTests(unittest.TestCase):
    def test_sample_scaling(self):
        raw = {
            "flg": 1, "tim": "20260925172409", "tmp": 444, "fac": 5000,
            "pac": 470, "sac": 470, "qac": 0, "eto": 188352,
            "etd": 173, "hto": 17930, "pf": 64, "wan": 0, "err": 0,
            "vac": [2315, 2369, 2384], "iac": [10, 10, 10],
            "vpv": [1500, 3399], "ipv": [71, 73], "str": [],
        }
        result = parse_inverter_data(raw)
        self.assertEqual(result.etd, 17.3)
        self.assertEqual(result.eto, 18835.2)
        self.assertEqual(result.tmp, 44.4)
        self.assertEqual(result.fac, 50)
        self.assertEqual(result.vac2, 236.9)
        self.assertEqual(result.ipv1, 0.71)
        self.assertEqual(result.pf, 0.64)
        self.assertEqual(result.timestamp.isoformat(), "2026-09-25T15:24:09+00:00")

    def test_discovery_rejects_wide_or_public_range(self):
        for subnet in ["0.0.0.0/0", "8.8.8.0/24", "127.0.0.0/24", "192.168.0.0/16", "bad"]:
            with self.assertRaises(HTTPException):
                asyncio.run(discover_inverters(subnet))

    def test_third_pv_input_and_signed_reactive_power(self):
        result = parse_inverter_data({"vpv": [1000, 2000, 3000], "ipv": [10, 20, 30],
                                      "qac": 4294967294})
        self.assertEqual(result.vpv3, 300.0)
        self.assertEqual(result.ipv3, 0.3)
        self.assertEqual(result.qac, -2)


if __name__ == "__main__":
    unittest.main()
