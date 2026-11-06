"""The release checkpoint fails closed and has no deployment capability."""
import copy
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

import yaml

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("release_readiness", ROOT / "scripts/check_release_readiness.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
SHA = "a" * 40


class ReleaseReadinessTests(unittest.TestCase):
    def setUp(self):
        self.context = {
            "GITHUB_EVENT_NAME": "workflow_dispatch", "GITHUB_REF": "refs/heads/main",
            "GITHUB_ACTOR": "owner", "GITHUB_REPOSITORY_OWNER": "owner",
            "OWNER_ACKNOWLEDGMENT": "true", "CANDIDATE_SHA": SHA, "GITHUB_SHA": SHA,
        }
        self.checks = {"check_runs": [
            {"id": index, "name": name, "app": {"slug": "github-actions"},
             "head_sha": SHA, "status": "completed", "conclusion": "success"}
            for index, name in enumerate(sorted(gate.REQUIRED_CHECKS), 1)
        ]}
        self.environment = {"can_admins_bypass": False, "protection_rules": [{
            "type": "required_reviewers", "prevent_self_review": False,
            "reviewers": [{"type": "User", "reviewer": {"login": "owner"}}],
        }]}

    def test_valid_request_is_only_a_readiness_checkpoint(self):
        self.assertEqual(gate.validate_dispatch(self.context), SHA)
        gate.validate_checks(self.checks, SHA)
        gate.validate_environment(self.environment, "owner")

    def test_every_dispatch_guard_refuses_its_negative_case(self):
        for key, value in {"GITHUB_EVENT_NAME": "schedule", "GITHUB_REF": "refs/heads/feature",
                           "GITHUB_ACTOR": "contributor", "GITHUB_REPOSITORY_OWNER": "",
                           "OWNER_ACKNOWLEDGMENT": "false", "CANDIDATE_SHA": "b" * 40}.items():
            with self.subTest(key=key), self.assertRaises(ValueError):
                gate.validate_dispatch({**self.context, key: value})

    def test_every_required_check_must_exist_and_succeed_for_the_exact_sha(self):
        for index in range(len(self.checks["check_runs"])):
            for field, value in [("conclusion", "failure"), ("conclusion", "skipped"),
                                 ("status", "in_progress"), ("head_sha", "b" * 40),
                                 ("app", {"slug": "another-app"})]:
                payload = copy.deepcopy(self.checks)
                payload["check_runs"][index][field] = value
                with self.subTest(index=index, field=field), self.assertRaises(ValueError):
                    gate.validate_checks(payload, SHA)
            payload = copy.deepcopy(self.checks)
            del payload["check_runs"][index]
            with self.assertRaises(ValueError):
                gate.validate_checks(payload, SHA)

    def test_incomplete_or_superseded_checks_cannot_pass(self):
        with self.assertRaises(ValueError):
            gate.validate_checks({**self.checks, "total_count": 101}, SHA)
        newer = {**self.checks["check_runs"][0], "id": 1000, "conclusion": "failure"}
        with self.assertRaises(ValueError):
            gate.validate_checks({"check_runs": self.checks["check_runs"] + [newer]}, SHA)

    def test_absent_or_weakened_owner_protection_is_refused(self):
        for payload in [{}, {**self.environment, "can_admins_bypass": True},
                        {**self.environment, "protection_rules": []}]:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                gate.validate_environment(payload, "owner")
        for reviewers in [[], [{"type": "User", "reviewer": {"login": "someone-else"}}],
                          self.environment["protection_rules"][0]["reviewers"] * 2]:
            payload = copy.deepcopy(self.environment)
            payload["protection_rules"][0]["reviewers"] = reviewers
            with self.assertRaises(ValueError):
                gate.validate_environment(payload, "owner")
        self.environment["protection_rules"][0]["prevent_self_review"] = True
        with self.assertRaises(ValueError):
            gate.validate_environment(self.environment, "owner")

    def test_unapproved_invocation_never_contacts_github(self):
        with patch.dict(gate.os.environ, {}, clear=True), patch.object(gate, "github_get") as fetch:
            self.assertEqual(gate.main(), 1)
            fetch.assert_not_called()

    def test_required_check_set_covers_the_maintained_workflows(self):
        names = set()
        for file in ("test.yml", "ci.yml"):
            workflow = yaml.load((ROOT / ".github/workflows" / file).read_text(encoding="utf-8"), Loader=yaml.BaseLoader)
            names.update(workflow["jobs"])
        self.assertTrue(names <= gate.REQUIRED_CHECKS)
        self.assertIn("production-dependency-audit", gate.REQUIRED_CHECKS)

    def test_workflow_has_no_automatic_or_secret_backed_deployment_path(self):
        workflow = yaml.load((ROOT / ".github/workflows/release-train.yml").read_text(encoding="utf-8"), Loader=yaml.BaseLoader)
        self.assertEqual(set(workflow["on"]), {"pull_request", "workflow_dispatch"})
        self.assertEqual(workflow["on"]["workflow_dispatch"]["inputs"]["owner_acknowledgment"]["default"], "false")
        self.assertTrue(all(value == "read" for value in workflow["permissions"].values()))
        jobs = workflow["jobs"]
        self.assertEqual(set(jobs), {"guard-tests", "candidate", "owner-checkpoint"})
        self.assertEqual(jobs["candidate"]["if"], "${{ github.event_name == 'workflow_dispatch' }}")
        self.assertEqual(jobs["candidate"]["needs"], "guard-tests")
        self.assertEqual(jobs["owner-checkpoint"]["needs"], "candidate")
        self.assertEqual(jobs["owner-checkpoint"]["if"], "${{ github.event_name == 'workflow_dispatch' }}")
        self.assertEqual(jobs["owner-checkpoint"]["environment"], gate.ENVIRONMENT)
        text = (ROOT / ".github/workflows/release-train.yml").read_text(encoding="utf-8")
        for forbidden in ("secrets.", "vercel deploy", "API_DEPLOY_CMD", "|| true", "continue-on-error", "env.RELEASE_TRAIN_ENABLED"):
            self.assertNotIn(forbidden, text)


if __name__ == "__main__":
    unittest.main()
