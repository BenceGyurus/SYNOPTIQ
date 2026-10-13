import sys
import unittest
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.energy_insights import summarize_days


def reading(day, energy, peak=1000):
    return {"date": day, "energy": energy, "peak": peak, "samples": 20,
            "first_generation": None, "last_generation": None, "temperature_max": 40}


class EnergyInsightsTests(unittest.TestCase):
    def test_missing_days_are_not_zero_or_included_in_average(self):
        now = datetime(2026, 10, 13, 12, tzinfo=ZoneInfo("Europe/Budapest"))
        result = summarize_days([reading(date(2026, 10, 10), 20),
                                 reading(date(2026, 10, 12), 0),
                                 reading(date(2026, 10, 13), 3)], now)
        self.assertIsNone(result["days"][-3]["energy"])
        self.assertEqual(result["days"][-2]["energy"], 0)
        self.assertEqual(result["average"], 10)
        self.assertEqual(result["best_day"]["date"], "2026-10-10")
        self.assertEqual(result["observed_days"], 3)

    def test_year_boundary_does_not_include_previous_year_in_totals(self):
        now = datetime(2027, 1, 2, 12, tzinfo=ZoneInfo("Europe/Budapest"))
        result = summarize_days([reading(date(2026, 12, 31), 10),
                                 reading(date(2027, 1, 1), 5)], now)
        self.assertEqual(result["monthly"], 5)
        self.assertEqual(result["yearly"], 5)
        self.assertIsNone(result["today"])
        self.assertEqual(result["yesterday"], 5)

    def test_empty_installation_and_daylight_saving_calendar(self):
        now = datetime(2026, 10, 26, 12, tzinfo=ZoneInfo("Europe/Budapest"))
        result = summarize_days([], now)
        self.assertEqual(len(result["days"]), 30)
        self.assertEqual(len({day["date"] for day in result["days"]}), 30)
        self.assertIsNone(result["average"])
        self.assertIsNone(result["best_day"])
        self.assertEqual(result["samples_today"], 0)
