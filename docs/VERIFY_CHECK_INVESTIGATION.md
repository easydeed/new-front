# VERIFY-CHECK — is email verification enforced, built-but-unused, or half-wired?

**Investigation. No code changed.**

---

## The answer

**Built-but-unused.** Both ends work. Nothing triggers it and nothing
enforces it.

The audit's observation — an account was immediately usable with no
`verified` flag — is correct, and the reason is not a bug in either
endpoint. It is that **no code path ever asks anybody to verify, and no
code path ever cares whether they did.**

---

## What exists, and works

| piece | state |
|---|---|
| `users.verified BOOLEAN DEFAULT FALSE` | exists, in the one schema authority |
| `POST /users/verify-email/request` | works — mints a 24h token, emails the link |
| `GET /users/verify-email?token=` | works — validates the `type: verify` claim, sets `verified = TRUE` |
| `frontend/src/app/verify-email/page.tsx` | exists — reads `?token=` and calls the GET |

So a link that arrives in somebody's inbox **does** verify them. The
machinery is complete and correct.

---

## What is missing — both ends of it

### 1. Nothing ever asks

`POST /users/verify-email/request` has **no caller**. Not from
registration, not from the frontend, not from any other endpoint. The
only occurrences of its path in the repo are its own route decorator and
a comment in a test.

Registration does not send a verification email. It sends the admin
notice and the welcome email; there is no
`send_verify_email_with_reason` call anywhere in `users_auth.py`.

So a new user is never given a link, and the frontend has no button to
ask for one. The `/verify-email` page can only be reached by a link that
nothing sends.

### 2. Nothing ever checks

`verified` is read in exactly **one** place: inside
`/users/verify-email/request`, to answer "already verified".

- Login does not check it (`SELECT id, password_hash, full_name, plan,
  is_active, role` — `verified` is not even selected).
- No endpoint gates on it.
- No screen displays it.
- It appears in the admin user list, and that is the only place a human
  can see it.

**A verified user and an unverified user are indistinguishable to every
part of this product except one admin column.**

---

## So which of the three?

Not *enforced* — nothing enforces.

Not *half-wired* either, which is what I expected to find. Half-wired
would mean a broken link in a working chain. This is the opposite: **the
chain is intact and disconnected at both ends.** Both endpoints do
exactly what they say; nobody calls one and nobody consults the result.

That distinction matters for what to do next. There is no defect to fix
here. There is a feature that was built and never turned on, and turning
it on is a product decision with consequences.

---

## Why this is an owner decision, per the `/security` precedent

`/security` was a page making claims the product could not support, and
the ruling was **enforce or remove — not leave it looking real**. The
same shape applies, with the same reasoning: a `verified` column that
nobody sets and nobody reads is a record that looks like a control and is
not one.

The two directions are genuinely different products:

### Enforce

Registration sends the link; something is gated on `verified`.

**What it costs:** the gate has to go somewhere, and every candidate has
a real cost. Gating **login** locks out every existing account —
`verified` defaults to FALSE and nobody has ever been asked, so *every
current user is unverified*. Gating **deed generation** blocks the paid
path. Gating **sharing** is the narrowest defensible choice: an
unverified address should probably not be able to send a stranger a link
with a property address on it.

**Prerequisite:** a backfill decision for existing rows. Grandfather
them, or send everybody a link at once.

**And it depends on email working.** `send_verify_email_with_reason`
returns a reason when it fails, and SendGrid is not configured in every
environment — so a gate on verification is a gate on our email
deliverability. That is a real availability coupling and it should be
chosen deliberately, not inherited.

### Remove

Delete both endpoints and the frontend page; drop the column (Tier 3,
after row counts).

**What it costs:** nothing operational today. What it gives up is the
groundwork, which is complete and would have to be rebuilt.

---

## What I would flag before either

**If enforcing:** the honest order is (1) send the link at registration
and display verification state to the user, (2) let it run and watch how
many verify, (3) gate something. Gating first, on a population that has
never been asked, locks out the whole customer base — which is the
`subscribe` mistake in the other direction: acting on a signal nobody was
given a chance to provide.

**If removing:** the column has values only in the sense that they are
all `FALSE`. Worth confirming with a row count before dropping, but there
is nothing here that can be lost.

**Either way:** the current state is the one option that should not
persist, because an admin looking at a `verified` column reasonably
reads it as meaning something.

---

## Not recommended without a ruling

I have not built or removed anything. The `/security` precedent makes
this an owner decision by construction, and the enforce path in
particular has a lockout consequence that no amount of care in the
implementation would soften.
