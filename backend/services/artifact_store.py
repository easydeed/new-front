"""A second copy of every stored instrument. RED-S2.

═══ THE FINDING THIS ANSWERS ═══

Every generated deed existed in exactly ONE place: `deed_pdfs.pdf_data`,
a BYTEA column in a single Postgres. No object store, no replica, no
export. The only S3 code in the repository stored INVOICES.

So the company replicated its billing PDFs and kept its customers' legal
instruments in one database column — and the sha256 that makes those
instruments verifiable lived in the same row, so losing the database lost
the documents AND the ability to prove what they had been.

═══ WHY A SECOND COPY IS NOT THE SAME AS A BACKUP ═══

A backup answers "can we get yesterday's data back". A second copy
answers "does this document exist anywhere else RIGHT NOW". They fail
differently and both are required: a backup taken before a deed was
generated does not contain it, and an object store does not protect
against a bad write it faithfully replicates.

RED-S2 does both. This module is the second copy; `scripts/
s2_restore_drill.py` is the backup, and — the part that matters — it is
EXECUTED rather than documented.

═══ ON NOT HAVING CREDENTIALS ═══

Production object storage needs credentials, and credentials are
owner-only by standing rule (Tier 3: env vars on Render, never committed
or pasted). So this module ships THREE backends:

  filesystem — a real second copy on a real volume. Works with no
               credentials, which is what makes the drill runnable here
               and in CI rather than aspirational.
  s3         — the production shape. Reads its configuration from the
               environment; the owner supplies it.
  none       — explicitly no second copy.

`none` is a legitimate choice for local development and an indefensible
one for production, so it is LOUD: it logs what it is not doing every
time it is asked to store something. A silent no-op backend would
recreate the exact defect this ticket exists to remove, while reporting
success — which is invariant #4's disease with a storage adapter on.

There is deliberately no automatic fallback from `s3` to `none`. If the
production backend is configured and broken, the honest outcome is a
recorded failure, not a quiet downgrade to storing nothing.
"""
from __future__ import annotations

import hashlib
import logging
import os
import shutil
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class ArtifactStoreError(Exception):
    """A second copy could not be written or read. Never swallowed."""


def artifact_key(deed_id: int, sha256: str) -> str:
    """Content-addressed within a deed's folder.

    The sha256 is IN the key on purpose. It means a re-render that
    produces different bytes cannot overwrite the stored artifact — it
    lands beside it — so §9's insert-or-refuse holds in the object store
    as well as the database, rather than only where it is enforced by
    application code.
    """
    return f"deeds/{deed_id}/{sha256}.pdf"


class BaseStore:
    name = "base"

    def put(self, key: str, data: bytes) -> None:
        raise NotImplementedError

    def get(self, key: str) -> Optional[bytes]:
        raise NotImplementedError

    def exists(self, key: str) -> bool:
        raise NotImplementedError

    def describe(self) -> str:
        return self.name


class FilesystemStore(BaseStore):
    """A real second copy, on a real path.

    Not a stub for S3 — a working backend. On a host with a mounted
    volume this is a legitimate production choice, and it is what makes
    the restore drill executable without credentials.
    """

    name = "filesystem"

    def __init__(self, root: str):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        p = (self.root / key).resolve()
        root = self.root.resolve()
        # A key is built from a deed id and a hex digest, so traversal is
        # not reachable today. Checked anyway: the cost is one comparison
        # and the failure mode is writing outside the store.
        if not str(p).startswith(str(root)):
            raise ArtifactStoreError(f"key escapes the store root: {key!r}")
        return p

    def put(self, key: str, data: bytes) -> None:
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        # Write-then-rename: a reader never sees a half-written artifact,
        # and a crash mid-write leaves a temp file rather than a
        # truncated "instrument".
        tmp = p.with_suffix(p.suffix + ".partial")
        tmp.write_bytes(data)
        os.replace(tmp, p)

    def get(self, key: str) -> Optional[bytes]:
        p = self._path(key)
        return p.read_bytes() if p.exists() else None

    def exists(self, key: str) -> bool:
        return self._path(key).exists()

    def describe(self) -> str:
        return f"filesystem:{self.root}"


class S3Store(BaseStore):
    """The production shape. Configuration is owner-supplied.

    No credentials are read, defaulted or logged here — the boto3 client
    resolves them from the environment/instance role in the usual way, so
    nothing secret passes through this file.
    """

    name = "s3"

    def __init__(self, bucket: str, prefix: str = ""):
        try:
            import boto3
        except ImportError as e:
            raise ArtifactStoreError(
                "ARTIFACT_STORE=s3 but boto3 is not installed") from e
        self.bucket = bucket
        self.prefix = prefix.strip("/")
        self._client = boto3.client("s3")

    def _key(self, key: str) -> str:
        return f"{self.prefix}/{key}" if self.prefix else key

    def put(self, key: str, data: bytes) -> None:
        self._client.put_object(Bucket=self.bucket, Key=self._key(key), Body=data)

    def get(self, key: str) -> Optional[bytes]:
        try:
            resp = self._client.get_object(Bucket=self.bucket, Key=self._key(key))
            return resp["Body"].read()
        except Exception as e:
            if "NoSuchKey" in str(e) or "404" in str(e):
                return None
            raise ArtifactStoreError(f"s3 get failed for {key}: {e}") from e

    def exists(self, key: str) -> bool:
        try:
            self._client.head_object(Bucket=self.bucket, Key=self._key(key))
            return True
        except Exception:
            return False

    def describe(self) -> str:
        return f"s3:{self.bucket}/{self.prefix}"


class NullStore(BaseStore):
    """No second copy — and it says so, every time.

    This is the pre-RED-S2 state, made explicit and noisy instead of
    being the unexamined default. If these lines appear in a production
    log, the finding this ticket closed is open again.
    """

    name = "none"

    def put(self, key: str, data: bytes) -> None:
        logger.warning(
            "[artifact-store] NO SECOND COPY: %s (%d bytes) exists only in "
            "Postgres. Set ARTIFACT_STORE to enable durable storage.",
            key, len(data))

    def get(self, key: str) -> Optional[bytes]:
        return None

    def exists(self, key: str) -> bool:
        return False


_store: Optional[BaseStore] = None


def get_store() -> BaseStore:
    """The configured backend, built once."""
    global _store
    if _store is not None:
        return _store

    kind = (os.getenv("ARTIFACT_STORE") or "none").strip().lower()
    if kind == "s3":
        bucket = os.getenv("ARTIFACT_S3_BUCKET")
        if not bucket:
            raise ArtifactStoreError(
                "ARTIFACT_STORE=s3 requires ARTIFACT_S3_BUCKET")
        _store = S3Store(bucket, os.getenv("ARTIFACT_S3_PREFIX", ""))
    elif kind == "filesystem":
        root = os.getenv("ARTIFACT_FS_ROOT")
        if not root:
            raise ArtifactStoreError(
                "ARTIFACT_STORE=filesystem requires ARTIFACT_FS_ROOT")
        _store = FilesystemStore(root)
    elif kind == "none":
        _store = NullStore()
    else:
        raise ArtifactStoreError(
            f"unknown ARTIFACT_STORE={kind!r} (filesystem | s3 | none)")

    logger.info("[artifact-store] using %s", _store.describe())
    return _store


def reset_store() -> None:
    """Test hook."""
    global _store
    _store = None


def verify(data: bytes, expected_sha256: str) -> bool:
    return hashlib.sha256(data).hexdigest() == expected_sha256


def copy_tree(src: Path, dst: Path) -> None:
    """Used by the restore drill to snapshot a filesystem store."""
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
