"""Read-only owner release checkpoint; never deploys or changes settings.

The owner must configure production-release-review with the repository owner
as its sole required reviewer and disable administrator bypass. An absent or
unprotected environment is refused BEFORE a job can implicitly create one.
"""
from __future__ import annotations

import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


REQUIRED_CHECKS = frozenset({
    "build-and-test", "test", "proof-harnesses", "frontend-tests",
    "tsc-baseline", "eslint-gate", "secrets-gate", "production-dependency-audit",
})
ENVIRONMENT = "production-release-review"


def validate_dispatch(context):
    candidate = context.get("CANDIDATE_SHA", "")
    if (context.get("GITHUB_EVENT_NAME") != "workflow_dispatch"
            or context.get("GITHUB_REF") != "refs/heads/main"
            or not context.get("GITHUB_REPOSITORY_OWNER")
            or context.get("GITHUB_ACTOR") != context.get("GITHUB_REPOSITORY_OWNER")
            or context.get("OWNER_ACKNOWLEDGMENT") != "true"):
        raise ValueError("A manual main-branch request with explicit owner acknowledgment is required")
    if not re.fullmatch(r"[0-9a-f]{40}", candidate) or candidate != context.get("GITHUB_SHA"):
        raise ValueError("Candidate must be the exact main SHA captured by this dispatch")
    return candidate


def validate_checks(payload, candidate):
    runs = payload.get("check_runs", [])
    if payload.get("total_count", len(runs)) > len(runs):
        raise ValueError("Check result set is incomplete; no release approval")
    latest = {}
    for run in runs:
        if run.get("app", {}).get("slug") != "github-actions":
            continue
        name = run.get("name")
        if name not in latest or run.get("id", 0) > latest[name].get("id", 0):
            latest[name] = run
    for name in sorted(REQUIRED_CHECKS):
        run = latest.get(name, {})
        if (run.get("head_sha") != candidate or run.get("status") != "completed"
                or run.get("conclusion") != "success"):
            raise ValueError(f"Required exact-candidate check is not green: {name}")


def validate_environment(payload, owner):
    rules = [rule for rule in payload.get("protection_rules", [])
             if rule.get("type") == "required_reviewers"]
    if len(rules) != 1 or payload.get("can_admins_bypass") is not False:
        raise ValueError("Owner review environment is absent, unprotected, or permits bypass")
    reviewers = rules[0].get("reviewers", [])
    if len(reviewers) != 1 or reviewers[0].get("type") != "User" or reviewers[0].get("reviewer", {}).get("login") != owner:
        raise ValueError("The repository owner must be the sole required release reviewer")
    if rules[0].get("prevent_self_review") is not False:
        raise ValueError("The sole owner must be allowed to review their own manual request")


def github_get(path, token):
    request = Request("https://api.github.com/" + path, headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def main():
    try:
        candidate = validate_dispatch(os.environ)
        repository = os.environ.get("GITHUB_REPOSITORY", "")
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
            raise ValueError("A valid GitHub repository context is required")
        token = os.environ.get("GH_TOKEN")
        if not token:
            raise ValueError("Read-only GitHub check access is unavailable")
        checks = github_get(f"repos/{repository}/commits/{candidate}/check-runs?filter=latest&per_page=100", token)
        validate_checks(checks, candidate)
        environment = github_get(f"repos/{repository}/environments/{ENVIRONMENT}", token)
        validate_environment(environment, os.environ["GITHUB_REPOSITORY_OWNER"])
    except (ValueError, KeyError):
        print("Release review refused: owner context, exact-SHA checks, or protected environment is not ready.")
        return 1
    except (HTTPError, URLError, OSError):
        # Never print tokens, request headers, or API error response bodies.
        print("Release review refused: GitHub readiness could not be verified.")
        return 1
    print(f"Exact-candidate checks passed for {candidate}; awaiting owner review. No deployment performed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
