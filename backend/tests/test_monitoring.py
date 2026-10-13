import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "monitoring"))
import validate


class MonitoringImportTests(unittest.TestCase):
    def test_grafana_startup_connection_reset_is_retried_before_import(self):
        health_calls = 0
        imports = []
        def http(request, timeout):
            nonlocal health_calls
            if request.full_url.endswith("/api/health"):
                health_calls += 1
                if health_calls == 1:
                    raise ConnectionResetError("Grafana is still starting")
                return io.BytesIO(b'{"database":"ok"}')
            if request.data:
                resource = json.loads(request.data)
                imports.append(resource["metadata"]["name"])
                return io.BytesIO(b'{}')
            language = request.full_url.rsplit("-", 1)[-1]
            return io.BytesIO(json.dumps({"spec": validate.dashboard(language)}).encode())
        with patch.dict("os.environ", {"GRAFANA_TEST_PASSWORD": "ci-only-test-password"}), \
             patch.object(validate, "urlopen", side_effect=http), \
             patch.object(validate.time, "sleep") as sleep:
            validate.grafana_import("http://127.0.0.1:3100")
        self.assertEqual(health_calls, 2)
        self.assertEqual(imports, ["solaris-solplanet-hu", "solaris-solplanet-en"])
        sleep.assert_called_once_with(1)
