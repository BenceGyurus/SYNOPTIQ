"""Exercise the actual analytics queries in an isolated PostgreSQL schema."""

import os
import sys
import unittest
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.api.v1.endpoints.metrics import read_insights, read_timeseries
from app.core.config import settings
from app.db.base import Base
from app.models.sql import Inverter, Metric
from app.services.prometheus_exporter import read_snapshot


@unittest.skipUnless(os.getenv("TEST_DATABASE_URL"), "Set TEST_DATABASE_URL for PostgreSQL integration")
class MetricsPostgresTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.schema = f"solaris_test_{uuid.uuid4().hex}"
        self.admin_engine = create_async_engine(os.environ["TEST_DATABASE_URL"])
        async with self.admin_engine.begin() as connection:
            await connection.execute(text(f'CREATE SCHEMA "{self.schema}"'))
        self.engine = create_async_engine(os.environ["TEST_DATABASE_URL"],
            connect_args={"server_settings": {"search_path": self.schema}})
        async with self.engine.begin() as connection:
            await connection.run_sync(lambda conn: Base.metadata.create_all(conn,
                tables=[Inverter.__table__, Metric.__table__]))

    async def asyncTearDown(self):
        await self.engine.dispose()
        async with self.admin_engine.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA "{self.schema}" CASCADE'))
        await self.admin_engine.dispose()

    async def test_daily_counters_peak_same_time_comparison_and_server_day_buckets(self):
        now = datetime.now(ZoneInfo(settings.INVERTER_TIMEZONE))
        midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
        first = midnight + (now - midnight) / 2
        latest = now - timedelta(milliseconds=1)
        previous = latest - timedelta(days=1, seconds=1)
        async with AsyncSession(self.engine) as db:
            db.add(Inverter(id=1, name="Test", serial_number="INSIGHTS-TEST", ip_address="192.168.1.15"))
            await db.flush()
            db.add_all([
                Metric(inverter_id=1, timestamp=first, pac=5000, etd=10.1, tmp=43),
                Metric(inverter_id=1, timestamp=latest, pac=3000, etd=14.3, tmp=41),
                Metric(inverter_id=1, timestamp=previous, pac=1000, etd=10, tmp=40),
            ])
            await db.commit()
            result = await read_insights(inverter_id=1, db=db)
            self.assertAlmostEqual(result["today"], 14.3)
            self.assertEqual(result["today_peak"], 5000)
            self.assertEqual(result["peak_at"], first)
            self.assertEqual(result["temperature_max"], 43)
            self.assertEqual(result["observed_days"], 2)
            self.assertIsNone(result["days"][-3]["energy"])
            self.assertAlmostEqual(result["comparison"]["yesterday"], 10)
            series = await read_timeseries(inverter_id=1, db=db, bucket_minutes=5, metric="power")
            self.assertTrue(series)
            self.assertTrue(all(point["timestamp"] >= midnight for point in series))
            self.assertTrue(all(point["value"] >= 3000 for point in series))

    async def test_exporter_reads_only_latest_sample_per_inverter_including_empty_devices(self):
        now = datetime.now(ZoneInfo(settings.INVERTER_TIMEZONE))
        async with AsyncSession(self.engine) as db:
            db.add_all([Inverter(id=index, name=f"Test {index}", serial_number=f"EXPORT-{index}",
                                ip_address="192.168.1.15") for index in (1, 2, 3)])
            await db.flush()
            db.add_all([
                Metric(inverter_id=1, timestamp=now - timedelta(hours=1), pac=100),
                Metric(inverter_id=1, timestamp=now, pac=950),
                Metric(inverter_id=2, timestamp=now, pac=2000),
            ])
            await db.commit()
            rows = await read_snapshot(db)
            self.assertEqual([(inverter.id, reading.pac if reading else None)
                              for inverter, reading in rows], [(1, 950), (2, 2000), (3, None)])
