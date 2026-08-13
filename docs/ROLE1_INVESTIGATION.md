# ROLE1 — what `users.role` actually is

**Investigation. No code changed.**

---

## The question, answered

> Does `role` carry both job title and authorization in one column?

**Yes.** And the codebase already says so, in its own words. From
`tests/test_registration_privilege.py`, written when #103 was fixed:

> `users.role` carries two meanings at once: the professional role that
> prints on a profile (Escrow Officer, Title Agent, …) and the value
> `is_admin_role()` reads to open the admin console.

Registration writes a **job title** into it — the dropdown offers
"Escrow Officer", "Title Agent", "Attorney", "Paralegal" — and
`is_admin_role()` reads the same column to decide who may mint API keys.

---

## Correction to my own pre-finding

In the `company_name` sweep I reported:

> `users.role` is authorization, `user_profiles.role` is professional — a
> name collision, not a duplicated fact, and merging them would be the
> bug.

**That was half right, and the wrong half matters.**

`users.role` is authorization **and** job title. So the job-title half
*is* duplicated across the two columns, in two spellings:

| column | vocabulary | written by | read by |
|---|---|---|---|
| `users.role` | `Escrow Officer`, `Title Agent`, … (title case) | registration, admin edit | `/users/profile`, admin console, **the JWT** |
| `users.role` | `admin`, `administrator`, `superadmin`, `super_admin` | admin edit only | `is_admin_role()` |
| `user_profiles.role` | `escrow_officer`, `title_officer`, `notary` (snake) | `POST /users/profile/enhanced` | `suggest_defaults` |

Rows 1 and 3 are **the same fact in two columns and two spellings**.
Row 2 shares a column with row 1.

So it is a collision *and* a duplicate. My earlier note under-reported it
and should not be relied on.

---

## Three gates, three definitions of "admin"

Executed against the same values rather than read:

| `users.role` | `is_admin_role()` (JWT gate) | `admin_partners.py:31` | `deeds_crud.py:509` (SQL) |
|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ |
| `Admin` | ✅ | ❌ | ❌ |
| `ADMIN` | ✅ | ❌ | ❌ |
| `administrator` | ✅ | ❌ | ❌ |
| `Administrator` | ✅ | ❌ | ❌ |
| `superadmin` | ✅ | ❌ | ❌ |
| `super_admin` | ✅ | ❌ | ❌ |
| `Escrow Officer` | ❌ | ❌ | ❌ |

- `auth.is_admin_role` — four spellings, case-insensitive.
- `routers/admin_partners.py:31` — `user.get('role') == 'admin'`, exact.
- `routers/deeds_crud.py:509` — `u.role = 'admin'` in SQL, exact.

**Six of eight values diverge.** The divergence is *restrictive* — the
JWT gate is the loosest — so this is **not** an escalation path. What it
produces is a **partial admin**: somebody with role `Administrator`
enters the admin console, and is then refused by the partner admin and by
the owner-or-admin deed fetch. They would experience that as the console
being broken.

Which of the three is the intended authority is not recorded anywhere.

---

## Does the #103 fix depend on the current shape?

**No.** It depends on the guard, not on the column's shape:

```python
if is_admin_role(user.role):
    raise HTTPException(400, "That role cannot be selected at registration.")
```

- It runs on the **resolved** value (after SIGNUP1's "Other" free text
  resolves), and **before** the INSERT — both verified by pin.
- It covers all four spellings, case-insensitively — six spellings driven
  end-to-end by `test_registration_privilege.py`, which also asserts no
  row exists afterwards to be promoted later.

Separating the columns would make the guard **unnecessary** rather than
break it: if `users.role` accepted only a closed set, an admin spelling
could not arrive from a public endpoint at all.

### And SIGNUP1's free text — the named input

Confirmed **not** an escalation path. The guard is on the resolved value,
pre-INSERT, case-insensitive, and pinned.

But the owner's framing is the right one: *safe because a guard catches
it* is weaker than *safe because it cannot arrive*. The free text widened
the vocabulary a public endpoint can put into the authorization column,
and it is one deleted `if` from being a hole.

---

## The path that is genuinely unguarded

`admin_api_v2.admin_update_user` — `allowed_fields` includes `'role'`,
and there is **no validation of the value at all**:

```python
allowed_fields = ['full_name', 'email', 'role', 'plan', 'company_name',
                  'phone', 'state', 'is_active', 'verified']
```

No closed set, no self-demotion guard, no confirmation. An admin may:

- set any user's role to any string — legitimate authority, unvalidated;
- create a **partial admin** by typing `Administrator` (console yes, two
  gates no);
- silently **fail** to grant admin by typing `adminn`, with no error;
- **demote themselves** and lose console access with no warning.

This is a bigger opening than the registration free text, and nothing
pins it.

---

## Revocation — better than expected

The JWT carries `role`, so a change is not instant. But
`/users/refresh-token` **re-reads the role from the database** on every
rotation:

```python
cur.execute("SELECT email, role FROM users WHERE id = %s", (user_id,))
...
create_access_token(data={"sub": ..., "email": email, "role": role or "user"})
```

Access tokens live 30 minutes, so **a revoked admin loses the console
within 30 minutes without signing out**. Recorded as a confirmation
because I expected to find it stale until re-login.

---

## A dead branch found on the way

`user_profiles.role` is effectively unreachable:

- **Only writer**: `POST /users/profile/enhanced` — no frontend caller.
- **Only reader**: `suggest_defaults` — reached only by
  `/ai/deed-suggestions`, which has no frontend caller.

So `ai_assist`'s `role == 'escrow_officer'` / `'title_officer'` /
`'notary'` branches never run in production. Whatever ROLE1 decides, that
column is not carrying weight today.

---

## What separating them would cost

**Shape:** `users.role` reduced to a closed set — `user` | `admin`.
Job title moves to `users.job_title`.

| step | size | risk |
|---|---|---|
| Add `users.job_title`, backfill from `role` where not an admin spelling | small, additive | none — same ALTER pattern as `interest_state` |
| Set `role = 'user'` where it is a job title | **needs row counts first** | the company_name discipline: count before writing |
| Registration writes `job_title`, leaves `role` alone | small | the #103 guard becomes redundant, not removed |
| `/users/profile` returns both | small | one response key added |
| Admin console: display + edit `job_title` freely; `role` becomes a two-value control | medium | the only real UI work |
| Converge the three gates on `is_admin_role` | small | **behaviour change**: `Administrator` gains what it is currently denied, or loses the console. Needs a ruling. |

**The load-bearing unknown:** how many production rows hold an admin
spelling, and which spelling. If any hold `Administrator` or
`superadmin`, converging the gates changes their access in one direction
or the other. Same discipline as `company_name` — **count before
deciding**, and the counting query is the deliverable, not the migration.

---

## What I would recommend, if asked

1. **Close the set.** `users.role` ∈ {`user`, `admin`}; job title to its
   own column. It converts "safe because a guard catches it" into "safe
   because it cannot arrive", which was the owner's own framing.
2. **One gate.** All three sites call `is_admin_role`. A second
   definition of admin is a second answer to a security question.
3. **Validate the admin edit** — a closed set, and a refusal when an
   admin demotes themselves.
4. **Count first.** Production row counts by role value, before any write.

None of this is built. Steps 1, 2 and 4 are mechanical once the gate
convergence is ruled; step 3 is the one I would do first regardless,
because it is the unguarded path and it is small.
