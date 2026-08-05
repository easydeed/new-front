# Backup and restore — the runbook, and the drill that proves it

**Status: the drill has been EXECUTED and passes.** Not "documented as a
procedure" — run, against real Postgres, with hash verification at every
step. See "Running the drill" below; the output is the evidence.

---

## What is being protected, and why it is unusual

Every deed this product generates is an **instrument**. It was rendered,
hashed with sha256, stored, and may have been printed, signed, notarised
and recorded. The hash is not a checksum for our convenience — doctrine
§3 removed QR codes from recorded pages on the reasoning that
*"verification survives as data"*, and this is that data.

So losing the database would not merely lose files. It would lose the
documents **and** the ability to prove what they had been, in one event.

Before RED-S2 there was exactly one copy: `deed_pdfs.pdf_data`, a BYTEA
column, in one Postgres, with the sha256 in the same row. The only
object-storage code in the repository stored **invoices**.

---

## The two things that are not the same

| | answers | fails when |
|---|---|---|
| **Backup** | "can we get yesterday's data back?" | the deed was generated after the backup |
| **Second copy** | "does this document exist anywhere else *right now*?" | a bad write is faithfully replicated |

Both are required. RED-S2 ships both.

---

## The second copy — configuration

`services/artifact_store.py`, selected by `ARTIFACT_STORE`:

| value | what it does | use |
|---|---|---|
| `filesystem` | real second copy on a mounted volume; needs `ARTIFACT_FS_ROOT` | local, CI, and a legitimate production choice on a host with a volume |
| `s3` | needs `ARTIFACT_S3_BUCKET`, optional `ARTIFACT_S3_PREFIX` | production |
| `none` | **no second copy** — logs a warning every time it is asked to store | local development only |

`none` is the pre-RED-S2 state made explicit and noisy. **If those
warnings appear in a production log, the finding is open again.**

There is deliberately **no automatic fallback from `s3` to `none`**. A
configured-and-broken production backend produces a recorded failure, not
a quiet downgrade to storing nothing — which would look identical to
success.

### Owner-side (Tier 3 — credentials never appear in this repo)

Set on Render, never committed, never pasted into chat:

- `ARTIFACT_STORE=s3`
- `ARTIFACT_S3_BUCKET=<bucket>`
- `ARTIFACT_S3_PREFIX=<optional prefix>`
- AWS credentials by the standard chain (instance role preferred over
  keys; no credential is read or logged by our code)

**The first production run of the drill against the real bucket is an
owner-side step**, for the same reason: this repository cannot hold the
credentials that would let CI do it.

---

## Writing: how the second copy is kept

`store_deed_pdf()` writes the database row, commits, **then** mirrors to
the object store.

That order is deliberate:

- The database row is the system of record. A slow or down object store
  must never hold up an officer's deed.
- Mirroring after the commit means a rolled-back transaction cannot leave
  an orphan artifact claiming to be an instrument that was never stored.
- A mirror failure is **recorded, not swallowed** — `artifact_error` on
  the deed's metadata plus a loud log. Same shape as the email path,
  where a failed send flags the row instead of losing the lead.

The object key is **content-addressed**: `deeds/{deed_id}/{sha256}.pdf`.
A re-render producing different bytes lands *beside* the original rather
than on top of it, so §9's insert-or-refuse holds in the object store
too — enforced by the key, not by a check someone has to remember.

---

## Deletion: the cascade is gone

`deed_pdfs.deed_id` was `REFERENCES deeds(id) ON DELETE CASCADE`.

§9 refuses to **overwrite** a stored instrument and the application
enforces that carefully — but the schema handed **DELETE** a cascade. The
doctrine guarded one verb. A cleanup script (`DELETE FROM deeds WHERE
created_at < ...` — the kind somebody writes on a Friday) would have
taken every notarised instrument with it, silently, and left nothing to
prove what had been there.

It is now `ON DELETE RESTRICT`, with an idempotent migration that
converges existing databases. Deletion is already **soft** everywhere in
this product (`status='deleted'`), so nothing legitimate is blocked.

---

## Running the drill

```bash
cd backend
DATABASE_URL=postgresql://...              \
ARTIFACT_STORE=filesystem                  \
ARTIFACT_FS_ROOT=/var/artifacts            \
python scripts/s2_restore_drill.py
```

Exit code 1 on any failure, so it can gate rather than inform. It
**refuses to run** against `ARTIFACT_STORE=none` — a drill that passes
against nothing would be the most dangerous green tick in the repository.

### What it proves, in order

| stage | proves |
|---|---|
| **A** generate | a deed with a real stored PDF and a recorded sha256; the second copy exists |
| **B** `pg_dump` | the actual tool produces a non-empty dump |
| **C** restore | `pg_restore` into a **separate** database; the artifact is present there |
| **D** verify | recovered bytes hash to the sha256 recorded at generation, and are byte-identical |
| **E** database loss | the row is **deleted** from the restored database and the instrument is recovered from the object store alone — hash-verified again |
| **F** cascade | deleting a deed that has a stored artifact is **refused** |

Stage E is the scenario the ticket exists for: the database is gone.

### Last executed

`2026-08-04` — all stages passed. Dump 2,339,103 bytes; recovered bytes
byte-identical and hash-matching at both D and E; the delete at F was
refused with `ForeignKeyViolation`.

---

## What this does not prove

The drill runs against the **configured** backend. With
`ARTIFACT_STORE=filesystem` it proves the mechanism and the recovery
completely.

It does **not** prove that a particular S3 bucket is reachable, because
bucket credentials are owner-supplied by standing rule and never live
here. Pointing the same code at S3 is a configuration change; the first
production run is an owner-side step.

Stated rather than glossed, because "we ran the drill" and "we ran the
drill against production storage" are different claims and only one of
them is true today.

---

## Restoring for real

1. **Stop writes** if the situation allows it — a restore that races
   live traffic produces a database nobody can reason about.
2. `pg_restore --no-owner --dbname <target> <dump>`.
3. **Verify before trusting**: for a sample of deeds, hash
   `deed_pdfs.pdf_data` and compare to `deed_pdfs.sha256`. Bytes that do
   not hash are not a recovery.
4. For any deed whose row is missing or fails its hash, recover from the
   object store at `deeds/{deed_id}/{sha256}.pdf`. The sha256 also lives
   on `deeds.metadata->>'pdf_sha256'`, so it survives the loss of the
   `deed_pdfs` row itself.
5. `read_stored_pdf()` already implements exactly this order —
   database first (it is the system of record), object store as the
   fallback, hash-verified on both paths.
