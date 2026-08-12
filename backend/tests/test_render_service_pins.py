"""Every service in `render.yaml` pins its Python.

═══ WHY A TEST AND NOT A CONVENTION ═══

The purge cron's first build died compiling Rust, because Render defaulted
a NEW service to 3.14 and `pydantic_core` has no wheel for it. Nobody
chose 3.14; nobody chose anything. The service inherited whatever the
default was on the afternoon it was created.

That is the failure this pin exists for, and it is not "somebody forgot".
It is that an unpinned service has a runtime NOBODY DECIDED, which can
change under it while the repo stays byte-identical. A convention cannot
catch that; the next service is created by whoever is on shift.

═══ WHAT THIS FILE CANNOT PROVE ═══

Only that services DECLARED HERE carry a pin. `render.yaml` describes one
service and production runs at least three — the cron is not in it — so a
green run here is not "every deployed service is pinned". It is "every
service this file knows about". The header in `render.yaml` says the same
thing to a human reading the file.

Bringing the undeclared services in is its own ticket, owner-ruled and
sequenced after NOTARY2 Part C. When that lands, this pin's coverage
becomes the real thing without a line of it changing — which is the
argument for writing it now.
"""
from pathlib import Path

# A HARD import, not `importorskip`. PyYAML is a declared dependency
# (requirements.txt), so a missing one is a broken environment rather than
# an absent optional — and `importorskip` would turn this pin into a
# silent skip, which is the one outcome a pin must never have. A test that
# can quietly not run is worse than no test, because the green tick still
# appears.
import yaml

REPO = Path(__file__).resolve().parents[2]
RENDER = REPO / "render.yaml"

# The owner's ruling, as a value rather than a range: 3.12 for wheel
# coverage across the current dependency set, one minor below the edge.
# Asserted exactly, because "pinned to something" is a weaker claim than
# "pinned to the thing we chose" — two services on two pinned versions
# is the same nondeterminism with extra steps.
EXPECTED = "3.12.7"


def _config():
    return yaml.safe_load(RENDER.read_text(encoding="utf-8"))


def test_render_yaml_parses():
    """A deploy file that does not parse is a deploy that does not happen,
    and nothing else in this file means anything if this fails."""
    assert isinstance(_config(), dict)


def test_every_declared_service_pins_python_version():
    config = _config()
    offenders = []
    for service in config.get("services") or []:
        env = {e.get("key"): e.get("value") for e in (service.get("envVars") or [])}
        if "PYTHON_VERSION" not in env:
            offenders.append(f"{service.get('name')} — no PYTHON_VERSION")
        elif str(env["PYTHON_VERSION"]) != EXPECTED:
            offenders.append(
                f"{service.get('name')} — pinned to {env['PYTHON_VERSION']}, "
                f"expected {EXPECTED}")
    assert offenders == [], (
        f"unpinned or divergently-pinned services: {offenders}. An unpinned "
        "service inherits whatever Render's default is on the day it builds; "
        "a differently-pinned one is the same nondeterminism with extra steps.")


def test_the_file_says_which_half_of_itself_is_authoritative():
    """RETARGETED — the file now makes TWO claims and the header has to
    keep them apart.

    It was a single disclaimer: "NOT THE DEPLOYMENT INVENTORY", because
    the file described one service while production ran more, and a
    config file that lies by OMISSION is harder to catch than one that
    lies by contents.

    That half still stands and is still pinned. What changed is that the
    file gained a claim it CAN honour: it is the ENVIRONMENT CONTRACT for
    the service it describes, cross-checked against
    services/environment.py. Leaving the blanket disclaimer over a half
    that is now checked would understate the file in the opposite
    direction — and a reader who believes nothing here is authoritative
    will not maintain the half that is.
    """
    header = RENDER.read_text(encoding="utf-8")[:3000]
    assert "NOT THE SERVICE INVENTORY" in header
    assert "dashboard" in header.lower()
    # And the half it DOES own, named.
    assert "ENVIRONMENT CONTRACT" in header
    assert "services/environment" in header


def test_the_downgrade_is_recorded_where_somebody_will_see_it():
    """3.12.7 is BELOW what the main API runs today. A pin that silently
    changes a running service's interpreter is a deploy-time surprise, so
    the file says it is deliberate and says what to do about it."""
    header = RENDER.read_text(encoding="utf-8")[:4000]
    assert "downgrade" in header.lower()
    assert "redeploy" in header.lower()
