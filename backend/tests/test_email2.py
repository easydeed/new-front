"""EMAIL2 — the signing-request email, from the owner's design.

`docs/design/email_signing_request.html` is the reference implementation.
What was adopted, and the two things that were not, are pinned here.

═══ THE DESIGN'S CENTRAL IDEA ═══

WHEN / FEE / WHERE, in that order, above everything else — the three
things a notary decides on. The design's own comment says so, and it is
right: she decides can I be there then, is it worth the trip, and where
am I going. Any of the three buried in a facts table is a thing she has
to hunt for while deciding.

═══ AND THE TWO REFUSALS ═══

The design says "Reply to this email — it goes to our signing team."
There is no signing team.

The design shows "~6 mi from you". This product holds a notary's city and
postal code, not a geocoded point, so a mileage would be arithmetic on
data we do not have.

Both are the same shape: a sentence that reads as service and is not
true. §0 declines the second for the same reason it declines every
heuristic — it would be roughly right often enough that nobody checked.
"""
from pathlib import Path

import pytest

from tests.source_text import code_only
from utils import email_templates as T

BACKEND = Path(__file__).resolve().parents[1]
DESIGN = BACKEND.parent / "docs" / "design" / "email_signing_request.html"

DISPATCH = dict(
    notary_name="Jerry", officer_name="John Doe", officer_company="Acme Escrow",
    deed_type="Affidavit of Death of Joint Tenant",
    property_address="1358 5th St, Santa Monica, CA 90401",
    county="Los Angeles", when_text="Fri, Aug 15 at 2:00 PM",
    location="Santa Monica", link="https://app.test/s/ABC/accept",
    expires_at="Sep 1, 2026",
)


def dispatched(**over):
    return T.notary_dispatched(**{**DISPATCH, **over})


# ── The design is the reference, and it is in the repo ───────────────

def test_the_design_is_committed_and_is_what_this_was_built_against():
    assert DESIGN.exists(), "the reference implementation must travel with the code"
    src = DESIGN.read_text(encoding="utf-8")
    assert "three things a notary decides on" in src


# ── WHEN / FEE / WHERE ───────────────────────────────────────────────

def test_the_three_decisions_lead_and_are_in_the_ruled_order():
    """THE PIN THIS FILE EXISTS FOR (first half)."""
    _, html, _ = dispatched(fee="85")
    # WITHIN THE BLOCK, not first-occurrence in the document: the address
    # legitimately appears earlier (subject line, preheader), and an
    # index-of test over the whole page measures the wrong thing — which
    # it did, on the first run.
    block = html[html.index("WHEN") if "WHEN" in html else 0:]
    start = html.lower().index("when</div>") if "when</div>" in html.lower() else None
    assert start is not None, "the decision block did not render"
    block = html[start:start + 1400]
    when = block.index("Fri, Aug 15 at 2:00 PM")
    fee = block.index("$85")
    where = block.index("Santa Monica")
    assert when < fee < where, "WHEN / FEE / WHERE is the order she decides in"
    # And the block leads: it comes before the quieter facts table.
    assert start < html.index("Los Angeles")


def test_the_fee_block_renders_only_when_she_set_one():
    _, with_fee, _ = dispatched(fee="85")
    assert "$85" in with_fee
    for absent in (None, "", "   "):
        _, without, text = dispatched(fee=absent)
        assert "Fee" not in without.replace("Fee&nbsp;", ""), absent
        assert "$" not in text.split("Accept:")[0], absent


def test_nothing_anywhere_computes_defaults_or_suggests_a_fee():
    """THE PIN THIS FILE EXISTS FOR (second half), and the one that keeps
    NOTARY0b intact.

    That ruling was no fee HANDLING: never quote, process, split, or
    suggest. Displaying a figure the officer typed is passing information
    between two people, not brokering between them — and the difference
    is entirely that no code here has an opinion about the number.

    A default would be a suggestion. Arithmetic would be a quote.
    """
    for path in (BACKEND / "utils" / "email_templates.py",
                 BACKEND / "utils" / "notifications.py"):
        body = code_only(path.read_text(encoding="utf-8"))
        for line in body.splitlines():
            if "fee" not in line.lower():
                continue
            # No arithmetic on it, and no default other than "absent".
            assert not any(op in line for op in ("fee *", "fee +", "fee /",
                                                 "fee -", "* fee", "+ fee")), line
            assert "fee=0" not in line.replace(" ", ""), line
            assert not any(w in line.lower() for w in
                           ("typical", "suggested", "recommend", "average",
                            "market rate", "going rate")), line
    # ═══ AND THE DEFAULT, CHECKED STRUCTURALLY ═══
    #
    # The word-list above missed the obvious mutation on its first probe:
    # `fee: Optional[str] = "75"` in a signature is a SUGGESTED fee, and
    # no list of suspicious words contains "75". §14.1 — match the
    # property, not the spelling. The property is that a fee parameter
    # defaults to absent and to nothing else.
    import ast
    for path in (BACKEND / "utils" / "email_templates.py",
                 BACKEND / "utils" / "notifications.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"), str(path))
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            args = node.args.args + node.args.kwonlyargs
            defaults = ([None] * (len(node.args.args) - len(node.args.defaults))
                        + list(node.args.defaults) + list(node.args.kw_defaults))
            for arg, default in zip(args, defaults):
                if "fee" not in arg.arg.lower() or default is None:
                    continue
                assert isinstance(default, ast.Constant) and default.value is None, (
                    f"{path.name}:{node.name} defaults {arg.arg} to "
                    f"{ast.unparse(default)} — a default fee is a suggested fee")


def test_the_fee_is_text_because_it_is_a_thing_she_wrote():
    """`$85 + travel` is a real answer. A numeric column would refuse it
    and would invite arithmetic on a number this product does not own."""
    src = (BACKEND / "database.py").read_text(encoding="utf-8")
    assert ("ALTER TABLE signing_requests ADD COLUMN IF NOT EXISTS "
            "offered_fee TEXT") in src


# ── The preheader, so she can triage from the inbox ──────────────────

def test_the_preheader_carries_document_fee_and_respond_by():
    """The design's idea and a good one: a notary scanning ten requests
    decides which to open on exactly these three."""
    _, html, _ = dispatched(fee="85", respond_by="Thu, Aug 14 at 5:00 PM PT")
    head = html[:1200]
    assert "Affidavit of Death of Joint Tenant" in head
    assert "$85" in head
    assert "respond by Thu, Aug 14 at 5:00 PM PT" in head


def test_the_preheader_omits_what_is_not_set_rather_than_showing_a_gap():
    _, html, _ = dispatched()
    head = html[:1200]
    assert "$" not in head
    assert "respond by" not in head


# ── Two variants, because the flow was re-ruled after the drawing ────

def test_dispatch_is_the_primary_path_and_asks_its_own_question():
    subject, html, text = dispatched()
    assert "Accept this signing" in html
    assert "at a set time" in text


def test_availability_is_the_fallback_and_keeps_the_designs_ask():
    _, html, _ = T.notary_invited(
        "Jerry", "John Doe", "Acme", "Grant Deed", "1358 5th St, Santa Monica",
        "Los Angeles", "https://app.test/s/ABC", "Sep 1, 2026", fee="85")
    assert "Post the times you are free" in html
    assert "Accept this signing" not in html


def test_neither_variant_says_anything_is_booked():
    """§13 reaching the email most tempted to break it. She is the party
    who has not answered; nothing is arranged until she does."""
    for _, html, text in (dispatched(), T.notary_invited(
            "J", "O", "C", "Grant Deed", "1 A St", "LA", "https://l", "Sep 1")):
        for body in (html.lower(), text.lower()):
            # ═══ A TEXTUAL PROXY FOR A SEMANTIC PROPERTY, SAID SO ═══
            #
            # What must be true is that the email never asserts the
            # signing IS arranged. That is not decidable by matching:
            # "Nothing is booked until you accept" and "when you and they
            # land on the same one, it is booked" are both correct copy
            # and both contain the forbidden substring. The first version
            # of this pin failed on both.
            #
            # So it checks the narrower thing it CAN check — every
            # occurrence sits in a clause that qualifies it — and this
            # comment is the record that the wider property is held by
            # the templates' own reasoning rather than by this assertion.
            QUALIFIERS = ("nothing", "until", "when", "once")
            for claim in ("is booked", "is confirmed", "has been scheduled"):
                at = 0
                while (at := body.find(claim, at)) != -1:
                    window = body[max(0, at - 70):at + 40]
                    assert any(q in window for q in QUALIFIERS), (
                        f"an unqualified {claim!r}: ...{window}...")
                    at += 1


# ── The escape hatch ─────────────────────────────────────────────────

def test_cannot_take_this_one_is_a_real_link():
    """A notary who cannot take it is the most useful early answer the
    officer can get. Making that the hard path is how a request sits
    unanswered for three days."""
    _, html, text = dispatched(decline_link="https://app.test/s/ABC/decline")
    assert "https://app.test/s/ABC/decline" in html
    assert "take this one" in html
    assert "https://app.test/s/ABC/decline" in text


# ── The two refusals ─────────────────────────────────────────────────

def test_there_is_no_signing_team_so_the_email_does_not_mention_one():
    """The design's line was "Reply to this email — it goes to our
    signing team". It does not; there is no such team. A support channel
    that does not exist is worse than no sentence, because she waits for
    an answer from nobody."""
    for _, html, text in (dispatched(), T.notary_invited(
            "J", "O", "C", "Grant Deed", "1 A St", "LA", "https://l", "Sep 1")):
        assert "signing team" not in html.lower()
        assert "signing team" not in text.lower()
    # And it says where a reply DOES go, naming the person.
    _, html, _ = dispatched()
    assert "reaches John Doe directly" in html


def test_no_distance_is_ever_rendered():
    """The design shows "~6 mi from you". Partners carry a city, state
    and postal code — NOT a geocoded point — so any mileage would be
    arithmetic on data this product does not hold.

    §0: it would be roughly right often enough that nobody checked.
    """
    _, html, text = dispatched(fee="85")
    for unit in (" mi ", " mi<", "miles from", "mi from you"):
        assert unit not in html
        assert unit not in text
    body = code_only((BACKEND / "utils" / "email_templates.py")
                     .read_text(encoding="utf-8"))
    assert "miles_from" not in body
    assert "distance" not in body.lower()


def test_the_footer_says_what_the_product_does_and_what_it_is_not():
    """Adopted verbatim from the design, and it belongs on anything sent
    to somebody who is not our customer."""
    _, html, text = dispatched()
    assert ("DeedPro prepares recorder-formatted documents at your direction. "
            "Nothing in this email is legal advice.") in html
    assert "Nothing in this email is legal advice." in text
