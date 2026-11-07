"""The preflight cannot inherit production settings or call missing gates green."""
import importlib.util
import io
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch


_path = Path(__file__).resolve().parents[2] / "scripts" / "platform_preflight.py"
_spec = importlib.util.spec_from_file_location("platform_preflight", _path)
preflight = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(preflight)


class PlatformPreflightTests(unittest.TestCase):
    def test_service_configuration_is_not_inherited(self):
        env = preflight.isolated_test_environment({
            "PATH": "tool-path", "SystemRoot": "os-root",
            "DATABASE_URL": "not-a-test-database", "PGSERVICE": "production",
            "PGPASSFILE": "private-file", "PGPASSWORD": "private-value",
            "JWT_SECRET_KEY": "private-value", "OPENAI_API_KEY": "private-value",
            "PYTHONPATH": "untrusted-import-path", "NODE_OPTIONS": "untrusted-node-options",
            "STRIPE_SECRET_KEY": "private-value", "FRONTEND_URL": "production-host",
        }, Path("scratch-artifacts"))
        self.assertEqual(env["PATH"], "tool-path")
        self.assertEqual(env["SystemRoot"], "os-root")
        self.assertFalse(any("private" in value for value in env.values()))
        for key in ("DATABASE_URL", "PGSERVICE", "PGPASSFILE", "PGPASSWORD", "PYTHONPATH",
                    "NODE_OPTIONS", "OPENAI_API_KEY", "STRIPE_SECRET_KEY", "FRONTEND_URL"):
            self.assertNotIn(key, env)
        self.assertEqual(env["ARTIFACT_STORE"], "filesystem")
        self.assertEqual(env["PYTHONUTF8"], "1")

    def test_probe_timeout_is_failure_not_success(self):
        with patch.object(preflight.subprocess, "run", side_effect=subprocess.TimeoutExpired("tool", 1)):
            self.assertEqual(preflight.probe("tool", [], env={}), {"status": "timeout"})

    def test_probe_does_not_return_child_output(self):
        with patch.object(preflight.subprocess, "run", return_value=subprocess.CompletedProcess([], 1)) as run:
            self.assertEqual(preflight.probe("tool", [], env={}), {"status": "failed", "exit_code": 1})
            self.assertEqual(run.call_args.kwargs["stdout"], subprocess.DEVNULL)
            self.assertEqual(run.call_args.kwargs["stderr"], subprocess.DEVNULL)

    def test_probe_missing_tool_is_failure_not_success(self):
        with patch.object(preflight.subprocess, "run", side_effect=FileNotFoundError("private command")):
            result = preflight.probe("tool", [], env={})
        self.assertEqual(result, {"status": "unavailable", "error_type": "FileNotFoundError"})

    def test_cli_refuses_missing_infrastructure(self):
        result = {
            "tools": {"node": "node", "psql": None, "pg_dump": None, "pg_restore": None},
            "checks": {}, "backend_dependency_mismatches": [],
            "frontend_dependencies_present": True,
            "product_gates": "not_run",
        }
        with patch.object(preflight, "report", return_value=result), \
                patch.object(preflight.sys, "argv", ["platform_preflight.py"]), \
                patch.object(preflight.sys, "stdout", io.StringIO()) as output:
            self.assertEqual(preflight.main(), 1)
        self.assertIn('"product_gates": "not_run"', output.getvalue())

    def test_cli_refuses_a_failed_import_even_with_tools(self):
        result = {
            "tools": {name: name for name in ("node", "psql", "pg_dump", "pg_restore")},
            "checks": {"weasyprint": {"status": "failed", "exit_code": 1}},
            "backend_dependency_mismatches": [], "frontend_dependencies_present": True,
        }
        with patch.object(preflight, "report", return_value=result), \
                patch.object(preflight.sys, "argv", ["platform_preflight.py"]), \
                patch.object(preflight.sys, "stdout", io.StringIO()):
            self.assertEqual(preflight.main(), 1)


if __name__ == "__main__":
    unittest.main()
