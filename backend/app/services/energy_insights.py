"""Summaries of observed inverter counters, without filling missing days."""

from datetime import datetime, timedelta


def summarize_days(rows: list[dict], now: datetime) -> dict:
    today = now.date()
    by_date = {row["date"]: row for row in rows}
    days = []
    for offset in range(29, -1, -1):
        day = today - timedelta(days=offset)
        row = by_date.get(day)
        days.append({
            "date": day.isoformat(),
            "energy": row["energy"] if row else None,
            "peak": row["peak"] if row else None,
            "samples": row["samples"] if row else 0,
        })
    completed = [day for day in days[:-1] if day["energy"] is not None]
    best = max(completed, key=lambda day: day["energy"], default=None)
    current = by_date.get(today)
    yesterday = by_date.get(today - timedelta(days=1))
    month_rows = [row for row in rows if row["date"].year == today.year
                  and row["date"].month == today.month]
    year_rows = [row for row in rows if row["date"].year == today.year]
    return {
        "timezone": str(now.tzinfo),
        "days": days,
        "today": current["energy"] if current else None,
        "yesterday": yesterday["energy"] if yesterday else None,
        "monthly": sum(row["energy"] or 0 for row in month_rows) if month_rows else None,
        "yearly": sum(row["energy"] or 0 for row in year_rows) if year_rows else None,
        "month_observed_days": len(month_rows),
        "year_observed_days": len(year_rows),
        "average": sum(day["energy"] for day in completed) / len(completed) if completed else None,
        "best_day": best,
        "observed_days": sum(day["samples"] > 0 for day in days),
        "today_peak": current["peak"] if current else None,
        "first_generation": current["first_generation"] if current else None,
        "last_generation": current["last_generation"] if current else None,
        "temperature_max": current["temperature_max"] if current else None,
        "samples_today": current["samples"] if current else 0,
    }
