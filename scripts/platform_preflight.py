"""Read-only local readiness checks for the platform remediation worktree.

This does not connect to a database, install dependencies, start services,
or declare the product's test gates passed. It never prints environment
variable values. Use the JSON report before running the real CI commands.
"""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from typing import Mapping


ROOT = Path(__file__).resolve().parents[1]
IMPORTS = ("pytest", "fastapi", "psycopg2", "weasyprint", "pydantic", "boto3")


def isolated_test_environment(
    inherited: Mapping[str, str], artifact_root: Path
) -> dict[str, str]:
    """Keep OS/tool settings, never an inherited service connection or key.

    No DATABASE_URL is supplied. Database-backed proof harnesses require a
    separately provisioned, marked scratch database and cannot pass here.
    The JWT value is a public test fixture, not a service credential.
    """
    allowed = {
        "PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP",
        "USERPROFILE", "HOME", "LOCALAPPDATA", "APPDATA", "LANG", "LC_ALL",
        "WEASYPRINT_DLL_DIRECTORIES",
    }
    env = {key: value for key, value in inherited.items() if key.upper() in allowed}
    env.update({
        "JWT_SECRET_KEY": "platform-local-test-fixture-not-a-service-secret",
        "ARTIFACT_STORE": "filesystem",
        "ARTIFACT_FS_ROOT": str(artifact_root.resolve()),
        "PYTHONUNBUFFERED": "1",
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUTF8": "1",
        "NEXT_TELEMETRY_DISABLED": "1",
    })
    return env


def probe(executable: str, arguments: list[str], *, env: Mapping[str, str],
          timeout: float = 15) -> dict:
    """Bound tooling checks; never include child output or command text.

    An import failure can contain settings or connection values. Record
    only its exit code; diagnostic logs require separate redaction.
    """
    try:
        result = subprocess.run(
            [executable, *arguments], env=dict(env), cwd=ROOT,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            timeout=timeout, check=False,
        )
    except subprocess.TimeoutExpired:
        return {"status": "timeout"}
    except OSError as exc:
        return {"status": "unavailable", "error_type": type(exc).__name__}
    return {"status": "ok" if result.returncode == 0 else "failed",
            "exit_code": result.returncode}


def installed_versions(requirements: str) -> list[dict]:
    result = []
    for raw in requirements.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "==" not in line:
            continue
        name, expected = line.split("==", 1)
        expected = expected.split("#", 1)[0].strip()
        try:
            actual = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            actual = None
        if actual != expected:
            result.append({"package": name, "expected": expected, "actual": actual})
    return result


def report(*, check_imports: bool = False, node_override: str | None = None) -> dict:
    env = isolated_test_environment(os.environ, ROOT / ".local-evidence" / "artifacts")
    tools = {name: shutil.which(name) for name in ("node", "npm", "psql", "pg_dump", "pg_restore")}
    if node_override:
        tools["node"] = str(Path(node_override).resolve())
    checks = {}
    if tools["node"]:
        checks["node"] = probe(tools["node"], ["--version"], env=env)
    if check_imports:
        for name in IMPORTS:
            checks[name] = probe(sys.executable, ["-I", "-c", f"import {name}"], env=env)
    mismatches = installed_versions((ROOT / "backend" / "requirements.txt").read_text(encoding="utf-8"))
    return {
        "python": sys.version.split()[0],
        "python_executable": sys.executable,
        "tools": tools,
        "checks": checks,
        "backend_dependency_mismatches": mismatches,
        "frontend_dependencies_present": (ROOT / "frontend" / "node_modules" / "jest" / "bin" / "jest.js").is_file(),
        "production_configuration_inherited": False,
        "database_proofs": "not_run_requires_marked_disposable_database",
        "product_gates": "not_run",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-imports", action="store_true")
    parser.add_argument("--node", help="Explicit Node executable when PATH lookup is unreliable")
    args = parser.parse_args()
    result = report(check_imports=args.check_imports, node_override=args.node)
    print(json.dumps(result, indent=2))
    unavailable = any(not result["tools"][key] for key in ("node", "psql", "pg_dump", "pg_restore"))
    failed = any(item["status"] != "ok" for item in result["checks"].values())
    return 1 if (unavailable or failed or result["backend_dependency_mismatches"]
                 or not result["frontend_dependencies_present"]) else 0


if __name__ == "__main__":
    raise SystemExit(main())
