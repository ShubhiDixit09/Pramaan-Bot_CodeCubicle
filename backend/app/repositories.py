from __future__ import annotations

import json
import sqlite3
from typing import Any
from uuid import uuid4

from .database import Database, utc_now


class NotFoundError(RuntimeError):
    pass


class ConflictError(RuntimeError):
    pass


class CaseRepository:
    def __init__(self, database: Database):
        self.database = database

    def list(self) -> list[dict[str, Any]]:
        with self.database.connect() as connection:
            rows = connection.execute(
                "SELECT * FROM cases WHERE is_deleted = 0 ORDER BY updated_at DESC"
            ).fetchall()
        return [dict(row) for row in rows]

    def get(self, case_id: str, include_deleted: bool = False) -> dict[str, Any]:
        query = "SELECT * FROM cases WHERE id = ?"
        params: tuple[Any, ...] = (case_id,)
        if not include_deleted:
            query += " AND is_deleted = 0"
        with self.database.connect() as connection:
            row = connection.execute(query, params).fetchone()
        if row is None:
            raise NotFoundError(f"Case {case_id} was not found")
        return dict(row)

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        case_id = str(uuid4())
        now = utc_now()
        with self.database.unit_of_work() as connection:
            connection.execute(
                """
                INSERT INTO cases(
                    id, title, description, jurisdiction, language, urgency,
                    status, revision, is_deleted, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'new', 0, 0, ?, ?)
                """,
                (
                    case_id,
                    payload["title"],
                    payload["description"],
                    payload["jurisdiction"],
                    payload["language"],
                    payload["urgency"],
                    now,
                    now,
                ),
            )
            self._append_event(connection, case_id, "CaseCreated", payload)
            self._append_audit(connection, case_id, "case.created", {"title": payload["title"]})
        return self.get(case_id)

    def update(
        self,
        case_id: str,
        changes: dict[str, Any],
        expected_revision: int,
        idempotency_key: str,
    ) -> dict[str, Any]:
        cached = self._idempotent_response(idempotency_key)
        if cached:
            return cached

        allowed = {"title", "description", "jurisdiction", "status"}
        changes = {key: value for key, value in changes.items() if key in allowed and value is not None}
        if not changes:
            return self.get(case_id)

        assignments = ", ".join(f"{key} = ?" for key in changes)
        values = list(changes.values())
        now = utc_now()
        with self.database.unit_of_work() as connection:
            cursor = connection.execute(
                f"""
                UPDATE cases
                SET {assignments}, revision = revision + 1, updated_at = ?
                WHERE id = ? AND revision = ? AND is_deleted = 0
                """,
                (*values, now, case_id, expected_revision),
            )
            if cursor.rowcount == 0:
                exists = connection.execute(
                    "SELECT revision FROM cases WHERE id = ? AND is_deleted = 0", (case_id,)
                ).fetchone()
                if not exists:
                    raise NotFoundError(f"Case {case_id} was not found")
                raise ConflictError(
                    f"Stale revision {expected_revision}; current revision is {exists['revision']}"
                )
            self._append_event(connection, case_id, "CaseUpdated", changes)
            self._append_audit(connection, case_id, "case.updated", changes)
            row = connection.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
            result = dict(row)
            self._store_idempotency(connection, idempotency_key, "case.update", result)
        return result

    def tombstone(self, case_id: str, expected_revision: int, key: str) -> dict[str, Any]:
        cached = self._idempotent_response(key)
        if cached:
            return cached
        with self.database.unit_of_work() as connection:
            cursor = connection.execute(
                """
                UPDATE cases
                SET is_deleted = 1, status = 'archived', revision = revision + 1, updated_at = ?
                WHERE id = ? AND revision = ? AND is_deleted = 0
                """,
                (utc_now(), case_id, expected_revision),
            )
            if cursor.rowcount == 0:
                raise ConflictError("Delete rejected because the case is missing or revision is stale")
            self._append_event(connection, case_id, "CaseDeleted", {"tombstone": True})
            self._append_audit(connection, case_id, "case.deleted", {"tombstone": True})
            row = connection.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
            result = dict(row)
            self._store_idempotency(connection, key, "case.delete", result)
        return result

    def related(self, case_id: str) -> dict[str, Any]:
        self.get(case_id)
        with self.database.connect() as connection:
            result = {}
            for table in (
                "facts",
                "evidence",
                "drafts",
                "domain_events",
                "audit_events",
                "legal_issues",
                "applicable_laws",
                "citations",
                "strategies",
                "timeline_events",
                "trust_reports",
                "procedure_runs",
            ):
                rows = connection.execute(
                    f"SELECT * FROM {table} WHERE case_id = ? ORDER BY created_at DESC", (case_id,)
                ).fetchall()
                result[table] = [dict(row) for row in rows]
        return result

    def _idempotent_response(self, key: str) -> dict[str, Any] | None:
        with self.database.connect() as connection:
            row = connection.execute(
                "SELECT response_json FROM idempotency_keys WHERE key = ?", (key,)
            ).fetchone()
        return json.loads(row["response_json"]) if row else None

    @staticmethod
    def _store_idempotency(
        connection: sqlite3.Connection, key: str, operation: str, response: dict[str, Any]
    ) -> None:
        connection.execute(
            "INSERT INTO idempotency_keys(key, operation, response_json, created_at) VALUES (?, ?, ?, ?)",
            (key, operation, json.dumps(response, ensure_ascii=False), utc_now()),
        )

    @staticmethod
    def _append_event(
        connection: sqlite3.Connection, case_id: str, event_type: str, payload: dict[str, Any]
    ) -> None:
        connection.execute(
            """
            INSERT INTO domain_events(id, case_id, event_type, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (str(uuid4()), case_id, event_type, json.dumps(payload, ensure_ascii=False), utc_now()),
        )

    @staticmethod
    def _append_audit(
        connection: sqlite3.Connection, case_id: str, action: str, details: dict[str, Any]
    ) -> None:
        connection.execute(
            """
            INSERT INTO audit_events(id, case_id, action, actor, details_json, created_at)
            VALUES (?, ?, ?, 'local-user', ?, ?)
            """,
            (str(uuid4()), case_id, action, json.dumps(details, ensure_ascii=False), utc_now()),
        )


