"""S1 follow-up — transport present but failing silently.

Owner report: SendGrid key + from-address exist on Render, yet shares
return email_sent: false. The old send path swallowed every failure into
`print(e)` + False — a valid key with an unverified sender looked
identical to "not configured," which is exactly what S1's first verdict
(wrongly) concluded. Pinned here:

- the failure REASON survives: send_email_with_reason returns (ok, why),
  SendGrid's 4xx body (the actual diagnosis) is extracted, and the
  silently-defaulted from-address is named in the reason;
- the env contract is explicit: SENDGRID_API_KEY + SENDGRID_FROM_EMAIL
  (fallback FROM_EMAIL) — the names the owner must match on Render;
- the share response carries email_error so the modal can say why.
"""
from unittest.mock import MagicMock, patch

from utils.email import send_email_with_reason


def test_env_contract_names_are_pinned(monkeypatch):
    """The exact names the code reads — rename these and production email
    dies silently again. Owner-side names on Render must match."""
    import inspect
    from utils import email as mod
    src = inspect.getsource(mod)
    assert "os.getenv('SENDGRID_API_KEY')" in src
    assert "os.getenv('SENDGRID_FROM_EMAIL')" in src
    assert "os.getenv('FROM_EMAIL')" in src


def test_unconfigured_reason_names_the_missing_var(monkeypatch):
    monkeypatch.delenv('SENDGRID_API_KEY', raising=False)
    ok, reason = send_email_with_reason('to@test.dev', 's', '<p>b</p>')
    assert ok is False
    assert 'SENDGRID_API_KEY' in reason


def test_sendgrid_4xx_body_survives_as_the_reason(monkeypatch):
    """SendGrid rejections (unverified sender = 403) arrive as exceptions
    whose .body names the cause — the diagnosis must not be swallowed."""
    monkeypatch.setenv('SENDGRID_API_KEY', 'SG.test')
    monkeypatch.setenv('SENDGRID_FROM_EMAIL', 'owner@example.com')

    class FakeHTTPError(Exception):
        body = b'{"errors":[{"message":"The from address does not match a verified Sender Identity"}]}'

    fake_client = MagicMock()
    fake_client.return_value.send.side_effect = FakeHTTPError('403')
    with patch.dict('sys.modules', {}, clear=False):
        with patch('sendgrid.SendGridAPIClient', fake_client):
            ok, reason = send_email_with_reason('to@test.dev', 's', '<p>b</p>')
    assert ok is False
    assert 'verified Sender Identity' in reason
    assert 'owner@example.com' in reason


def test_defaulted_from_address_is_named_in_failures(monkeypatch):
    """No from-var set → the hardcoded default is used AND called out —
    an unverified default sender is the classic silent 403."""
    monkeypatch.setenv('SENDGRID_API_KEY', 'SG.test')
    monkeypatch.delenv('SENDGRID_FROM_EMAIL', raising=False)
    monkeypatch.delenv('FROM_EMAIL', raising=False)

    fake_client = MagicMock()
    fake_client.return_value.send.side_effect = Exception('boom')
    with patch('sendgrid.SendGridAPIClient', fake_client):
        ok, reason = send_email_with_reason('to@test.dev', 's', '<p>b</p>')
    assert ok is False
    assert 'noreply@deedpro.com' in reason
    assert 'SENDGRID_FROM_EMAIL' in reason  # tells the operator the fix


def test_success_returns_true_none(monkeypatch):
    monkeypatch.setenv('SENDGRID_API_KEY', 'SG.test')
    monkeypatch.setenv('SENDGRID_FROM_EMAIL', 'owner@example.com')
    resp = MagicMock()
    resp.status_code = 202
    fake_client = MagicMock()
    fake_client.return_value.send.return_value = resp
    with patch('sendgrid.SendGridAPIClient', fake_client):
        ok, reason = send_email_with_reason('to@test.dev', 's', '<p>b</p>')
    assert ok is True and reason is None


def test_share_endpoint_carries_the_reason():
    """Source pin: the share response includes email_error and the log
    line carries the [SHARE-EMAIL] prefix the ticket names."""
    import inspect
    import routers.sharing as mod
    src = inspect.getsource(mod)
    assert '"email_error": email_error' in src
    assert '[SHARE-EMAIL]' in src
    assert 'send_share_notification_with_reason' in src
