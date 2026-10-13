"""Validate dashboard generation, emit promtool inputs, and test Grafana imports."""

import argparse
import base64
import json
import os
import re
import sys
import time
from http.client import HTTPException
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

from generate_dashboards import ROOT, dashboard


def check_dashboards():
    for language in ("hu", "en"):
        data = json.loads((ROOT / "grafana" / f"solaris-{language}.json").read_text())
        assert data == dashboard(language), "Generated dashboard is out of date"
        assert len({panel["id"] for panel in data["panels"]}) == len(data["panels"])
        for panel in data["panels"]:
            grid = panel["gridPos"]
            assert grid["x"] >= 0 and grid["x"] + grid["w"] <= 24
            defaults = panel.get("fieldConfig", {}).get("defaults", {})
            assert defaults.get("custom", {}).get("gradientMode", "none") == "none"
            assert panel.get("options", {}).get("graphMode", "none") == "none"
            for target in panel.get("targets", []):
                assert target["datasource"]["uid"] == "${DS_PROMETHEUS}"
                assert "job=~" in target["expr"] and "instance=~" in target["expr"]
        for first in data["panels"]:
            a = first["gridPos"]
            for second in data["panels"]:
                if first["id"] >= second["id"]:
                    continue
                b = second["gridPos"]
                assert a["x"] + a["w"] <= b["x"] or b["x"] + b["w"] <= a["x"] or a["y"] + a["h"] <= b["y"] or b["y"] + b["h"] <= a["y"], "Overlapping dashboard panels"


def fixture(path):
    sys.path.insert(0, str(ROOT.parent / "backend"))
    from app.models.sql import Inverter, Metric
    from app.services.prometheus_exporter import render_snapshot
    from prometheus_client.parser import text_string_to_metric_families
    now = datetime.now(timezone.utc)
    reading = Metric(timestamp=now, pac=950, sac=960, qac=-10, fac=50, tmp=40,
        pf=0.99, eto=1000, etd=12.3, hto=100, flg=1, wan=0, err=0,
        vac1=230, vac2=231, vac3=232, iac1=1.4, iac2=1.4, iac3=1.4,
        vpv1=500, ipv1=2, vpv2=0, ipv2=0, vpv3=0, ipv3=0)
    output = render_snapshot([(Inverter(id=1, name="CI roof", serial_number="CI-NOT-A-REAL-DEVICE"), reading)], now, 180, "Europe/Budapest")
    path.write_bytes(output)
    names = {sample.name for family in text_string_to_metric_families(output.decode()) for sample in family.samples}
    for panel in dashboard("en")["panels"]:
        for target in panel.get("targets", []):
            for name in re.findall(r"\bsolaris_[a-z_]+", target["expr"]):
                assert name in names, f"Dashboard references a missing exporter metric: {name}"


def rules(path):
    expressions = sorted({target["expr"] for panel in dashboard("en")["panels"] for target in panel.get("targets", [])})
    result = []
    for index, expression in enumerate(expressions):
        for variable, value in (("$__range", "6h"), ("$job", ".*"), ("$instance", ".*"), ("$inverter", ".*")):
            expression = expression.replace(variable, value)
        assert "$" not in expression, "Unresolved Grafana variable in promtool input"
        result.append({"record": f"solaris_dashboard_validation_{index}", "expr": expression})
    path.write_text(json.dumps({"groups": [{"name": "dashboard-syntax-validation-only", "rules": result}]}, indent=2) + "\n")


def grafana_import(base):
    password = os.environ["GRAFANA_TEST_PASSWORD"]
    auth = base64.b64encode(f"ci:{password}".encode()).decode()
    def api(path, payload=None):
        request = Request(base.rstrip("/") + path, data=json.dumps(payload).encode() if payload else None,
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"})
        with urlopen(request, timeout=10) as response:
            return json.load(response)
    deadline = time.monotonic() + 60
    while True:
        try:
            api("/api/health")
            break
        except (URLError, OSError, HTTPException):
            if time.monotonic() >= deadline:
                raise RuntimeError("Grafana did not become ready")
            time.sleep(1)
    for language in ("hu", "en"):
        data = dashboard(language)
        resource = "/apis/dashboard.grafana.app/v1/namespaces/default/dashboards"
        api(resource, {"metadata": {"name": data["uid"]}, "spec": data})
        imported = api(resource + "/" + data["uid"])
        assert len(imported["spec"]["panels"]) == len(data["panels"])
        assert imported["spec"]["title"] == data["title"]
        print(f"Grafana imported {data['uid']} ({len(data['panels'])} panels)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--rules", type=Path)
    parser.add_argument("--grafana")
    args = parser.parse_args()
    check_dashboards()
    if args.fixture:
        fixture(args.fixture)
    if args.rules:
        rules(args.rules)
    if args.grafana:
        grafana_import(args.grafana)
    print("Monitoring validation passed")


if __name__ == "__main__":
    main()
