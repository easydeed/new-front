"""Shared mutable module state (T8 split).

LAST_REQUEST_TS is rebound on every request, so consumers must
``import app_state`` and use ``app_state.LAST_REQUEST_TS`` /
``app_state.METRICS`` (module-attribute access, never from-import).
"""
from collections import defaultdict

# Phase 6-2: System Metrics Tracking
METRICS = defaultdict(int)
LAST_REQUEST_TS = 0.0
