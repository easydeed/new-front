"""Route-contract tests for the T7 cache cleanup."""
from main import app


def routes():
    out = set()
    for r in app.routes:
        for m in getattr(r, "methods", None) or set():
            out.add((m, r.path))
    return out


def test_live_sitex_surface_survives():
    rt = routes()
    assert ("POST", "/api/property/search-v2") in rt
    assert ("POST", "/api/property/resolve-match") in rt
    # The live AI-suggestions cache endpoints stay too.
    assert ("POST", "/property/cache") in rt
    assert ("GET", "/property/suggestions") in rt


def test_legacy_google_era_endpoints_are_gone():
    paths = {p for _, p in routes()}
    assert "/api/property/validate" not in paths
    assert "/api/property/search-history" not in paths
    assert "/api/property/cached-properties" not in paths
    assert "/api/property/search-legacy" not in paths


def test_titlepoint_endpoints_are_gone():
    # T6: the TitlePoint stack was torn down; the proven method lives in
    # docs/skills/titlepoint-integration.md for the future rebuild.
    paths = {p for _, p in routes()}
    assert "/api/property/test/titlepoint-tax" not in paths
    assert "/api/property/test/titlepoint-property" not in paths
    assert "/api/property/test/titlepoint-credentials" not in paths


def test_titlepoint_modules_are_gone():
    import importlib.util
    assert importlib.util.find_spec("services.titlepoint_service") is None
    assert importlib.util.find_spec("title_point_integration") is None
