import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, patch

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from fastapi import FastAPI
from prometheus_client.parser import text_string_to_metric_families
from pydantic import SecretStr

from app.api import prometheus as endpoint
from app.core.config import settings
from app.dependencies import get_db
from app.models.sql import Inverter, Metric
from app.services.prometheus_exporter import render_snapshot

NOW = datetime(2026, 10, 13, 12, tzinfo=timezone.utc)


def sample(timestamp=NOW, **values):
    fields = {"timestamp": timestamp, "pac": 950, "eto": 12.3, "etd": 4.5,
              "hto": 100, "tmp": 40, "qac": -10, "pf": 0.99,
              "vpv1": 500, "ipv1": 2, "vac1": 230, "iac1": 1}
    fields.update(values)
    return Metric(**fields)


def samples(rows, now=NOW):
    output = render_snapshot(rows, now, 180, "Europe/Budapest").decode()
    return {entry.name + str(sorted(entry.labels.items())): entry.value
            for family in text_string_to_metric_families(output) for entry in family.samples}


def value(metrics, suffix, **labels):
    return metrics.get("solaris_inverter_" + suffix + str(sorted(labels.items())))


class PrometheusSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.inverter = Inverter(id=1, name='Roof "east"\\north\nÁrnyék', serial_number="TEST-1")

    def test_base_units_types_derived_power_and_label_escaping(self):
        rows = [(self.inverter, sample())]
        metrics = samples(rows)
        labels = {"inverter_id": "1"}
        self.assertEqual(value(metrics, "data_fresh", **labels), 1)
        self.assertEqual(value(metrics, "energy_joules_total", **labels), 12.3 * 3_600_000)
        self.assertEqual(value(metrics, "energy_today_joules", **labels), 4.5 * 3_600_000)
        self.assertEqual(value(metrics, "operating_time_seconds_total", **labels), 360_000)
        self.assertEqual(value(metrics, "ac_reactive_power_vars", **labels), -10)
        self.assertEqual(value(metrics, "pv_power_watts", input="PV1", **labels), 1000)
        self.assertEqual(value(metrics, "ac_dc_ratio", **labels), 0.95)
        self.assertEqual(value(metrics, "info", name=self.inverter.name, serial_number="TEST-1", **labels), 1)
        families = list(text_string_to_metric_families(render_snapshot(rows, NOW, 180, "Europe/Budapest").decode()))
        self.assertEqual(next(f for f in families if f.name == "solaris_inverter_energy_joules").type, "counter")
        self.assertEqual(next(f for f in families if f.name == "solaris_inverter_energy_today_joules").type, "gauge")
        self.assertTrue(all(entry.timestamp is None for family in families for entry in family.samples))

    def test_stale_samples_hide_live_values_but_retain_known_counters(self):
        metrics = samples([(self.inverter, sample(timestamp=NOW - timedelta(hours=2)))])
        self.assertEqual(value(metrics, "data_fresh", inverter_id="1"), 0)
        self.assertEqual(value(metrics, "sample_age_seconds", inverter_id="1"), 7200)
        self.assertIsNone(value(metrics, "ac_power_watts", inverter_id="1"))
        self.assertIsNotNone(value(metrics, "energy_joules_total", inverter_id="1"))
        self.assertIsNotNone(value(metrics, "energy_today_joules", inverter_id="1"))

    def test_daily_energy_is_not_carried_across_inverter_local_midnight(self):
        now = datetime(2026, 10, 13, 22, 10, tzinfo=timezone.utc)
        previous = now - timedelta(minutes=20)
        metrics = samples([(self.inverter, sample(timestamp=previous))], now)
        self.assertIsNone(value(metrics, "energy_today_joules", inverter_id="1"))
        self.assertIsNotNone(value(metrics, "energy_joules_total", inverter_id="1"))

    def test_missing_inverter_data_and_deleted_inverters_do_not_become_zero_power(self):
        metrics = samples([(self.inverter, None)])
        self.assertEqual(value(metrics, "data_fresh", inverter_id="1"), 0)
        self.assertIsNone(value(metrics, "ac_power_watts", inverter_id="1"))
        self.assertIsNone(value(metrics, "sample_age_seconds", inverter_id="1"))
        samples([(self.inverter, sample())])
        self.assertFalse(any("inverter_id" in key for key in samples([])))

    def test_invalid_ratios_nonfinite_values_and_future_clock_skew(self):
        metrics = samples([(self.inverter, sample(pac=1500, tmp=float("nan"), fac=float("inf")))])
        self.assertIsNone(value(metrics, "ac_dc_ratio", inverter_id="1"))
        self.assertIsNone(value(metrics, "temperature_celsius", inverter_id="1"))
        self.assertIsNone(value(metrics, "ac_frequency_hertz", inverter_id="1"))
        future = samples([(self.inverter, sample(timestamp=NOW + timedelta(hours=1)))])
        self.assertEqual(value(future, "data_fresh", inverter_id="1"), 0)
        self.assertIsNone(value(future, "ac_power_watts", inverter_id="1"))


class PrometheusEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.app = FastAPI()
        self.app.include_router(endpoint.router)
        self.db_calls = 0
        async def database():
            self.db_calls += 1
            yield object()
        self.app.dependency_overrides[get_db] = database
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_disabled_and_unauthorized_scrapes_never_touch_database(self):
        with patch.object(settings, "PROMETHEUS_TOKEN", SecretStr("")):
            self.assertEqual((await self.client.get("/metrics")).status_code, 404)
        with patch.object(settings, "PROMETHEUS_TOKEN", SecretStr("dedicated-test-token")):
            for header in ("", "Bearer wrong", "Basic dedicated-test-token", "Bearer áé"):
                response = await self.client.get("/metrics", headers={"authorization": header.encode()})
                self.assertEqual(response.status_code, 401)
                self.assertIn("Bearer", response.headers["www-authenticate"])
        self.assertEqual(self.db_calls, 0)

    async def test_scrape_is_prometheus_text_and_not_a_browser_session(self):
        with patch.object(settings, "PROMETHEUS_TOKEN", SecretStr("dedicated-test-token")), \
             patch.object(endpoint, "read_snapshot", AsyncMock(return_value=[])):
            response = await self.client.get("/metrics", headers={"authorization": "Bearer dedicated-test-token"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/plain; version=0.0.4", response.headers["content-type"])
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertIn("solaris_exporter_max_sample_age_seconds", response.text)

    async def test_database_failure_is_a_failed_scrape_not_empty_success(self):
        with patch.object(settings, "PROMETHEUS_TOKEN", SecretStr("dedicated-test-token")), \
             patch.object(endpoint, "read_snapshot", AsyncMock(side_effect=TimeoutError)):
            response = await self.client.get("/metrics", headers={"authorization": "Bearer dedicated-test-token"})
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("solaris_inverter_", response.text)
