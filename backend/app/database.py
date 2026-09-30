from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator


SCHEMA_VERSION = 1

SCHEMA = """
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    language TEXT NOT NULL,
    urgency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    revision INTEGER NOT NULL DEFAULT 0,
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT NOT NULL,
    superseded_by_id TEXT REFERENCES facts(id),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    filename TEXT NOT NULL,
    media_type TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    extracted_text TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    fact_bindings_json TEXT NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS domain_events (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    case_id TEXT REFERENCES cases(id),
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    details_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delegation_grants (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    grantee TEXT NOT NULL,
    scope TEXT NOT NULL,
    expires_at TEXT,
    revoked_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legal_issues (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    domain TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    confidence REAL NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applicable_laws (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    act_name TEXT NOT NULL,
    section TEXT NOT NULL,
    relevance REAL NOT NULL,
    corpus_ref TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS citations (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    law_id TEXT REFERENCES applicable_laws(id),
    citation_text TEXT NOT NULL,
    source_url TEXT,
    jurisdiction TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategies (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    summary TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    event_date TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trust_reports (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    score REAL NOT NULL,
    citation_coverage REAL NOT NULL,
    grounding_score REAL NOT NULL,
    pii_safe INTEGER NOT NULL,
    disclaimer_present INTEGER NOT NULL,
    findings_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    operation TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS procedure_runs (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    procedure_id TEXT NOT NULL,
    state_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facts_case ON facts(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_drafts_case ON drafts(case_id);
CREATE INDEX IF NOT EXISTS idx_events_case ON domain_events(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_events(case_id);
CREATE INDEX IF NOT EXISTS idx_laws_case ON applicable_laws(case_id);
CREATE INDEX IF NOT EXISTS idx_trust_case ON trust_reports(case_id);
"""


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


class Database:
    def __init__(self, path: str | Path, key: str | None = None):
        self.path = Path(path)
        self.key = key

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=10, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        if self.key:
            escaped_key = self.key.replace("'", "''")
            connection.execute(f"PRAGMA key = '{escaped_key}'")
            cipher = connection.execute("PRAGMA cipher_version").fetchone()
            if not cipher:
                connection.close()
                raise RuntimeError(
                    "PRAMAAN_DB_KEY is configured, but this Python SQLite driver has no SQLCipher support"
                )
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def security_status(self) -> dict[str, Any]:
        """Report the actual at-rest encryption capability without guessing."""

        with self.connect() as connection:
            row = connection.execute("PRAGMA cipher_version").fetchone()
        cipher_version = row[0] if row else None
        return {
            "driver": "sqlcipher" if cipher_version else "sqlite",
            "encrypted": bool(cipher_version and self.key),
            "cipher_version": cipher_version,
            "key_configured": bool(self.key),
        }

    def migrate(self) -> None:
        with self.connect() as connection:
            connection.executescript(SCHEMA)
            connection.execute(
                "INSERT OR IGNORE INTO schema_version(version, applied_at) VALUES (?, ?)",
                (SCHEMA_VERSION, utc_now()),
            )

    @contextmanager
    def unit_of_work(self) -> Iterator[sqlite3.Connection]:
        connection = self.connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    @staticmethod
    def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
        return dict(row) if row is not None else None

    @staticmethod
    def encode(value: Any) -> str:
        return json.dumps(value, ensure_ascii=False, sort_keys=True)

    def cached_response(self, key: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT response_json FROM idempotency_keys WHERE key = ?", (key,)
            ).fetchone()
        return json.loads(row["response_json"]) if row else None

    @staticmethod
    def store_response(
        connection: sqlite3.Connection,
        key: str,
        operation: str,
        response: dict[str, Any],
    ) -> None:
        connection.execute(
            """
            INSERT INTO idempotency_keys(key, operation, response_json, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (key, operation, json.dumps(response, ensure_ascii=False), utc_now()),
        )


