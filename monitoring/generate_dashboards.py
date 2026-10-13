"""Generate portable Grafana Classic JSON dashboards, with no external plugins."""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DS = {"type": "prometheus", "uid": "${DS_PROMETHEUS}"}
SELECTOR = '{job=~"$job",instance=~"$instance",inverter_id=~"$inverter"}'
LEGEND = "{{instance}} · #{{inverter_id}}"


def metric(name):
    return "solaris_inverter_" + name + SELECTOR


def dashboard(lang):
    hu = lang == "hu"
    def tr(hungarian, english):
        return hungarian if hu else english
    panels = []
    y = 0

    def panel(title, kind, x, width, height, queries=(), unit="none", description=""):
        result = {"id": len(panels) + 1, "type": kind, "title": title,
            "gridPos": {"x": x, "y": y, "w": width, "h": height},
            "datasource": DS, "description": description,
            "fieldConfig": {"defaults": {"unit": unit, "noValue": tr("Nincs adat", "No data"),
                "color": {"mode": "palette-classic"}, "mappings": []}, "overrides": []},
            "targets": [{"refId": chr(65 + index), "expr": expression, "legendFormat": legend,
                "datasource": DS, "editorMode": "code", "range": kind == "timeseries",
                "instant": kind != "timeseries", "format": "time_series", "interval": "30s"}
                for index, (expression, legend) in enumerate(queries)]}
        if kind == "stat":
            result["options"] = {"colorMode": "value", "graphMode": "none", "justifyMode": "auto",
                "orientation": "auto", "textMode": "auto", "wideLayout": True,
                "reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False}}
        elif kind == "timeseries":
            result["fieldConfig"]["defaults"]["custom"] = {"drawStyle": "line", "lineInterpolation": "linear",
                "lineWidth": 2, "fillOpacity": 8, "gradientMode": "none", "spanNulls": False,
                "showPoints": "never", "axisPlacement": "auto", "scaleDistribution": {"type": "linear"},
                "stacking": {"mode": "none", "group": "A"}, "thresholdsStyle": {"mode": "off"}}
            result["options"] = {"legend": {"showLegend": True, "displayMode": "table", "placement": "bottom", "calcs": ["lastNotNull", "max"]},
                "tooltip": {"mode": "multi", "sort": "desc"}}
        panels.append(result)
        return result

    def row(title):
        nonlocal y
        panels.append({"id": len(panels) + 1, "type": "row", "title": title, "collapsed": False,
            "panels": [], "gridPos": {"x": 0, "y": y, "w": 24, "h": 1}})
        y += 1

    def stats(entries):
        nonlocal y
        width = 24 // len(entries)
        results = [panel(title, "stat", index * width, width, 4, [(expression, LEGEND)], unit, description)
            for index, (title, expression, unit, description) in enumerate(entries)]
        y += 4
        return results

    def charts(entries):
        nonlocal y
        for index, (title, unit, queries, description) in enumerate(entries):
            panel(title, "timeseries", index * 12, 12, 8, queries, unit, description)
        y += 8

    def boolean(result, zero, one):
        result["fieldConfig"]["defaults"]["mappings"] = [{"type": "value", "options": {
            "0": {"text": zero, "color": "orange"}, "1": {"text": one, "color": "green"}}}]

    intro = panel("Solaris · Solplanet", "text", 0, 24, 3)
    intro["options"] = {"mode": "markdown", "content": tr(
        "**Válassz Prometheus adatforrást, célpontot és invertert a felső szűrőkben.** A pillanatnyi adatok csak friss mérésnél jelennek meg. Az energia és üzemidő az utolsó ismert számlálóérték; a napi energia az inverter helyi naptári napjára vonatkozik. A Prometheus-előzmények az első scrape-től indulnak.",
        "**Select a Prometheus data source, target and inverter using the filters above.** Live telemetry is shown only for fresh samples. Energy and operating time are last-known counters; daily energy uses the inverter's local calendar day. Prometheus history starts with the first scrape.")}
    y += 3
    row(tr("Termelés és elérhetőség", "Production & availability"))
    header = stats([
        (tr("Exporter elérhető", "Exporter reachable"), 'up{job=~"$job",instance=~"$instance"}', "none", tr("A Prometheus scrape eredménye, az inverter adatfrissességétől függetlenül.", "Prometheus scrape health, independent of inverter freshness.")),
        (tr("Inverter adatfrissesség", "Inverter data freshness"), metric("data_fresh"), "none", tr("A tárolt mérés kora alapján; nem közvetlen hálózati próba.", "Based on stored sample age; not a direct network probe.")),
        (tr("AC teljesítmény", "AC power"), metric("ac_power_watts"), "watt", ""),
        (tr("Mai energia", "Energy today"), metric("energy_today_joules") + " / 3600000", "kwatth", tr("Az inverter mai utolsó ismert napi számlálóértéke. Éjfél után új mérésig nincs érték.", "Last-known counter for the current inverter-local day. Absent after midnight until a new sample.")),
        (tr("Összes energia", "Lifetime energy"), metric("energy_joules_total") + " / 3600000", "kwatth", tr("Utolsó ismert élettartam-számláló.", "Last-known lifetime counter.")),
        (tr("Utolsó mérés kora", "Sample age"), metric("sample_age_seconds"), "s", ""),
    ])
    boolean(header[0], tr("Scrape hiba", "Scrape failed"), "OK")
    boolean(header[1], tr("Hiányzó / régi", "Missing / stale"), tr("Friss", "Fresh"))
    charts([
        (tr("DC bemenet és AC kimenet", "DC input & AC output"), "watt", [(metric("dc_power_watts"), LEGEND + " · DC"), (metric("ac_power_watts"), LEGEND + " · AC")], ""),
        (tr("Napi energiaszámláló", "Daily energy counter"), "kwatth", [(metric("energy_today_joules") + " / 3600000", LEGEND)], tr("Naponta újrainduló gauge; nem rate() vagy increase() bemenet.", "A gauge that resets daily; do not use with rate() or increase().")),
    ])
    stats([
        (tr("Energia a kiválasztott időszakban", "Energy in selected range"), "increase(" + metric("energy_joules_total") + "[$__range]) / 3600000", "kwatth", tr("A Prometheus increase() becslése a scrape-elt számlálóból; a tartomány szélein extrapolálhat.", "Prometheus increase() estimate from scraped counters; may extrapolate at range boundaries.")),
        (tr("Időszak mért AC csúcsa", "Observed AC peak in range"), "max_over_time(" + metric("ac_power_watts") + "[$__range])", "watt", tr("A Prometheus által megfigyelt csúcs, a scrape-ek között előforduló csúcsok kimaradhatnak.", "Peak observed by Prometheus; peaks between scrapes may be missed.")),
        (tr("Inverter-hőmérséklet", "Inverter temperature"), metric("temperature_celsius"), "celsius", ""),
    ])
    row(tr("Napelemágak és átalakítás", "PV inputs & conversion"))
    charts([
        (tr("PV teljesítmény áganként", "PV power by input"), "watt", [(metric("pv_power_watts"), LEGEND + " · {{input}}")], tr("Számított feszültség × áram.", "Calculated voltage × current.")),
        (tr("Számított AC/DC arány", "Calculated AC/DC ratio"), "percentunit", [(metric("ac_dc_ratio"), LEGEND)], tr("Csak legalább 100 W DC-nél és 0 < AC ≤ DC esetén. Nem minősített hatásfokmérés.", "Only with DC ≥100 W and 0 < AC ≤ DC. Not a certified efficiency measurement.")),
    ])
    charts([
        (tr("PV feszültség", "PV voltage"), "volt", [(metric("pv_voltage_volts"), LEGEND + " · {{input}}")], ""),
        (tr("PV áram", "PV current"), "amp", [(metric("pv_current_amperes"), LEGEND + " · {{input}}")], ""),
    ])
    row(tr("Hálózat és inverter", "Grid & inverter"))
    charts([
        (tr("Fázisfeszültségek", "Phase voltages"), "volt", [(metric("ac_voltage_volts"), LEGEND + " · {{phase}}")], ""),
        (tr("Fázisáramok", "Phase currents"), "amp", [(metric("ac_current_amperes"), LEGEND + " · {{phase}}")], ""),
    ])
    charts([
        (tr("Hálózati frekvencia", "Grid frequency"), "hertz", [(metric("ac_frequency_hertz"), LEGEND)], ""),
        (tr("Jelentett teljesítménytényező", "Reported power factor"), "percentunit", [(metric("power_factor_ratio"), LEGEND)], tr("Az inverter által jelentett érték; nem az AC/DC arány.", "The value reported by the inverter; distinct from the AC/DC ratio.")),
    ])
    charts([
        (tr("Látszólagos és meddő teljesítmény", "Apparent & reactive power"), "suffix:VA", [(metric("ac_apparent_power_volt_amperes"), LEGEND + " · VA"), (metric("ac_reactive_power_vars"), LEGEND + " · var")], ""),
        (tr("Inverter-hőmérséklet", "Inverter temperature"), "celsius", [(metric("temperature_celsius"), LEGEND)], ""),
    ])
    apparent = panels[-2]
    apparent["fieldConfig"]["overrides"] = [{"matcher": {"id": "byFrameRefID", "options": "B"},
        "properties": [{"id": "unit", "value": "suffix:var"}, {"id": "custom.axisPlacement", "value": "right"}]}]
    row(tr("Diagnosztika", "Diagnostics"))
    stats([
        (tr("Hibakód", "Fault code"), metric("error_code"), "none", tr("Nyers gyártói kód; 0 = nincs jelentett hiba.", "Raw manufacturer code; 0 = no reported fault.")),
        (tr("Figyelmeztetési kód", "Warning code"), metric("warning_code"), "none", tr("Nyers gyártói kód; 0 = nincs jelentett figyelmeztetés.", "Raw manufacturer code; 0 = no reported warning.")),
        (tr("Állapotjelző", "Operating flag"), metric("operating_flag"), "none", tr("Nyers flg érték, feltételezett megfejtés nélkül.", "Raw flg value, without an inferred status mapping.")),
        (tr("Összes üzemóra", "Lifetime operating hours"), metric("operating_time_seconds_total") + " / 3600", "suffix:h", tr("Utolsó ismert üzemidő-számláló.", "Last-known operating time counter.")),
    ])
    charts([
        (tr("Adatfrissesség időben", "Data freshness over time"), "none", [(metric("data_fresh"), LEGEND)], tr("1 = friss, 0 = régi vagy hiányzó mérés. Az alvó inverterek éjszaka elavultnak tűnhetnek.", "1 = fresh, 0 = old or missing. Sleeping inverters may show stale data at night.")),
        (tr("Mérési késés", "Measurement delay"), "s", [(metric("sample_age_seconds"), LEGEND)], ""),
    ])
    table = panel(tr("Inverterek", "Inverters"), "table", 0, 24, 6, [(metric("info"), "")])
    table["targets"][0]["format"] = "table"
    table["options"] = {"showHeader": True, "cellHeight": "sm", "footer": {"show": False}}
    table["transformations"] = [
        {"id": "filterFieldsByName", "options": {"include": {"names": ["instance", "inverter_id", "name", "serial_number"]}}},
        {"id": "organize", "options": {"renameByName": {"instance": tr("Célpont", "Target"), "inverter_id": "ID", "name": tr("Név", "Name"), "serial_number": tr("Sorozatszám", "Serial")}}},
    ]
    variables = [{"name": "DS_PROMETHEUS", "label": "Prometheus", "type": "datasource", "query": "prometheus", "refresh": 1, "current": {}, "options": []}]
    for name, label, expression in (
        ("job", "Job", "label_values(solaris_inverter_info, job)"),
        ("instance", tr("Célpont", "Target"), 'label_values(solaris_inverter_info{job=~"$job"}, instance)'),
        ("inverter", "Inverter ID", 'label_values(solaris_inverter_info{job=~"$job",instance=~"$instance"}, inverter_id)'),
    ):
        variables.append({"name": name, "label": label, "type": "query", "datasource": DS,
            "query": {"query": expression, "refId": "StandardVariableQuery"}, "definition": expression,
            "refresh": 2, "sort": 1, "multi": True, "includeAll": True, "allValue": ".*",
            "current": {"selected": True, "text": "All", "value": "$__all"}, "options": []})
    return {"id": None, "uid": "solaris-solplanet-" + lang, "title": tr("Solaris · Solplanet napelemrendszer", "Solaris · Solplanet solar monitoring"),
        "description": tr("Helyi inverteradatok a Solaris Prometheus exporterből.", "Local inverter telemetry from the Solaris Prometheus exporter."),
        "tags": ["solaris", "solplanet", "solar", "prometheus"], "timezone": "browser", "schemaVersion": 39,
        "version": 1, "editable": True, "graphTooltip": 1, "refresh": "30s", "time": {"from": "now-6h", "to": "now"},
        "timepicker": {"refresh_intervals": ["30s", "1m", "5m", "15m"]}, "annotations": {"list": []},
        "links": [], "templating": {"list": variables}, "panels": panels}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for lang in ("hu", "en"):
        path = ROOT / "grafana" / f"solaris-{lang}.json"
        content = json.dumps(dashboard(lang), ensure_ascii=False, indent=2) + "\n"
        if args.check:
            if not path.exists() or path.read_text() != content:
                raise SystemExit(f"Regenerate {path.name}: python monitoring/generate_dashboards.py")
        else:
            path.parent.mkdir(exist_ok=True)
            path.write_text(content)


if __name__ == "__main__":
    main()
