"""Prometheus snapshots of stored, already-scaled Solplanet readings."""

import math
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from prometheus_client import CollectorRegistry, generate_latest
from prometheus_client.core import CounterMetricFamily, GaugeMetricFamily
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sql import Inverter, Metric

PREFIX = "solaris_inverter_"
LABELS = ["inverter_id"]
LIVE_METRICS = (
    ("ac_power_watts", "Active AC output power in watts.", "pac"),
    ("ac_apparent_power_volt_amperes", "Apparent AC output power in volt-amperes.", "sac"),
    ("ac_reactive_power_vars", "Signed reactive AC output power in vars.", "qac"),
    ("ac_frequency_hertz", "AC frequency in hertz.", "fac"),
    ("temperature_celsius", "Inverter temperature in degrees Celsius.", "tmp"),
    ("power_factor_ratio", "Power factor reported by the inverter, as a ratio.", "pf"),
    ("operating_flag", "Raw manufacturer operating flag; no state mapping is inferred.", "flg"),
    ("warning_code", "Raw manufacturer warning code, zero means no reported warning.", "wan"),
    ("error_code", "Raw manufacturer fault code, zero means no reported fault.", "err"),
)


def finite(value):
    return value is not None and isinstance(value, (int, float)) and math.isfinite(value)


async def read_snapshot(db: AsyncSession):
    # One indexed correlated lookup per configured inverter, in one database query.
    latest_id = (select(Metric.id).where(Metric.inverter_id == Inverter.id, Metric.timestamp.is_not(None))
                 .order_by(Metric.timestamp.desc(), Metric.id.desc()).limit(1)
                 .correlate(Inverter).scalar_subquery())
    result = await db.execute(select(Inverter, Metric)
        .outerjoin(Metric, Metric.id == latest_id).order_by(Inverter.id))
    return result.all()


class SnapshotCollector:
    def __init__(self, rows, now: datetime, max_age: int, zone: str):
        self.rows = rows
        self.now = now
        self.max_age = max_age
        self.zone = ZoneInfo(zone)

    def collect(self):
        families = {}

        def gauge(suffix, help_text, extra=()):
            name = PREFIX + suffix
            if name not in families:
                families[name] = GaugeMetricFamily(name, help_text, labels=LABELS + list(extra))
            return families[name]

        info = gauge("info", "Configured inverter metadata.", ("name", "serial_number"))
        fresh = gauge("data_fresh", "1 when a stored sample is fresh, 0 when missing, old or over 30 seconds in the future.")
        timestamp = gauge("last_sample_timestamp_seconds", "Unix time of the most recent stored inverter sample.")
        age_metric = gauge("sample_age_seconds", "Age of the latest stored sample; future clock skew is clamped to zero.")
        today_energy = gauge("energy_today_joules", "Last known daily energy in joules, only for the current inverter-local calendar day.")
        energy = CounterMetricFamily(PREFIX + "energy_joules_total", "Last known lifetime energy in joules; device resets are possible.", labels=LABELS)
        operating = CounterMetricFamily(PREFIX + "operating_time_seconds_total", "Last known lifetime operating time in seconds.", labels=LABELS)
        for suffix, help_text, _ in LIVE_METRICS:
            gauge(suffix, help_text)
        for side, dimension, unit, extra in (
            ("ac", "voltage", "volts", "phase"), ("ac", "current", "amperes", "phase"),
            ("pv", "voltage", "volts", "input"), ("pv", "current", "amperes", "input"),
            ("pv", "power", "watts", "input"),
        ):
            gauge(f"{side}_{dimension}_{unit}", f"{side.upper()} {dimension} in {unit}, from the latest fresh sample.", (extra,))
        dc = gauge("dc_power_watts", "Sum of available PV voltage times current, in watts.")
        ratio = gauge("ac_dc_ratio", "Calculated AC/DC power ratio, only for consistent readings above 100 W DC input.")

        for inverter, metric in self.rows:
            labels = [str(inverter.id)]
            info.add_metric(labels + [inverter.name or "Inverter", inverter.serial_number], 1)
            if metric is None:
                fresh.add_metric(labels, 0)
                continue
            sampled_at = metric.timestamp
            if sampled_at.tzinfo is None:
                sampled_at = sampled_at.replace(tzinfo=timezone.utc)
            age = (self.now - sampled_at).total_seconds()
            is_fresh = -30 <= age <= self.max_age
            fresh.add_metric(labels, int(is_fresh))
            timestamp.add_metric(labels, sampled_at.timestamp())
            age_metric.add_metric(labels, max(0, age))
            if age >= -30:
                if finite(metric.eto) and metric.eto >= 0:
                    energy.add_metric(labels, metric.eto * 3_600_000)
                if finite(metric.hto) and metric.hto >= 0:
                    operating.add_metric(labels, metric.hto * 3600)
                if sampled_at.astimezone(self.zone).date() == self.now.astimezone(self.zone).date() and finite(metric.etd) and metric.etd >= 0:
                    today_energy.add_metric(labels, metric.etd * 3_600_000)
            if not is_fresh:
                continue
            for suffix, _, attribute in LIVE_METRICS:
                value = getattr(metric, attribute)
                if finite(value):
                    families[PREFIX + suffix].add_metric(labels, value)
            dc_inputs = []
            for index in (1, 2, 3):
                for suffix, attribute, channel in (
                    ("ac_voltage_volts", f"vac{index}", f"L{index}"),
                    ("ac_current_amperes", f"iac{index}", f"L{index}"),
                    ("pv_voltage_volts", f"vpv{index}", f"PV{index}"),
                    ("pv_current_amperes", f"ipv{index}", f"PV{index}"),
                ):
                    value = getattr(metric, attribute)
                    if finite(value):
                        families[PREFIX + suffix].add_metric(labels + [channel], value)
                voltage, current = getattr(metric, f"vpv{index}"), getattr(metric, f"ipv{index}")
                if finite(voltage) and finite(current) and voltage >= 0 and current >= 0:
                    power = voltage * current
                    if finite(power):
                        families[PREFIX + "pv_power_watts"].add_metric(labels + [f"PV{index}"], power)
                        dc_inputs.append(power)
            if dc_inputs:
                dc_power = sum(dc_inputs)
                dc.add_metric(labels, dc_power)
                if dc_power >= 100 and finite(metric.pac) and 0 < metric.pac <= dc_power:
                    ratio.add_metric(labels, metric.pac / dc_power)
        yield from families.values()
        yield energy
        yield operating
        limit = GaugeMetricFamily("solaris_exporter_max_sample_age_seconds", "Maximum age of a fresh stored sample, in seconds.")
        limit.add_metric([], self.max_age)
        yield limit


def render_snapshot(rows, now: datetime, max_age: int, zone: str) -> bytes:
    # A registry per scrape prevents races and old series surviving inverter deletion.
    registry = CollectorRegistry(auto_describe=False)
    registry.register(SnapshotCollector(rows, now, max_age, zone))
    return generate_latest(registry)
