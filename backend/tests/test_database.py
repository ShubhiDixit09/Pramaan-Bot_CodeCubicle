import sqlite3

import pytest

from app.repositories import CaseRepository, ConflictError


def payload():
    return {
        "title": "Tenant eviction notice",
        "description": "My landlord asked me to leave without giving a written notice.",
        "jurisdiction": "Delhi",
        "language": "Hinglish",
        "urgency": "high",
    }


def test_schema_has_expected_domain_tables(database):
    with database.connect() as connection:
        names = {
            row["name"]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
    expected = {
        "cases", "facts", "evidence", "drafts", "domain_events", "audit_events",
        "delegation_grants", "legal_issues", "applicable_laws", "citations",
        "strategies", "timeline_events", "trust_reports", "schema_version",
    }
    assert expected <= names


def test_storage_security_status_is_explicit(database):
    status = database.security_status()
    assert status["driver"] in {"sqlite", "sqlcipher"}
    assert isinstance(status["encrypted"], bool)
    if status["driver"] == "sqlite":
        assert status["encrypted"] is False


def test_cas_rejects_stale_revision(database):
    repository = CaseRepository(database)
    case = repository.create(payload())
    repository.update(
        case["id"], {"status": "active"}, case["revision"], "update-key-0001"
    )
    with pytest.raises(ConflictError):
        repository.update(
            case["id"], {"status": "resolved"}, case["revision"], "update-key-0002"
        )


def test_idempotency_replays_original_response(database):
    repository = CaseRepository(database)
    case = repository.create(payload())
    first = repository.update(
        case["id"], {"status": "active"}, case["revision"], "same-key-0001"
    )
    second = repository.update(
        case["id"], {"status": "resolved"}, first["revision"], "same-key-0001"
    )
    assert second == first
    assert repository.get(case["id"])["status"] == "active"


def test_tombstone_preserves_events_and_audit(database):
    repository = CaseRepository(database)
    case = repository.create(payload())
    deleted = repository.tombstone(case["id"], case["revision"], "delete-key-0001")
    assert deleted["is_deleted"] == 1
    with database.connect() as connection:
        case_count = connection.execute(
            "SELECT count(*) AS n FROM cases WHERE id = ?", (case["id"],)
        ).fetchone()["n"]
        event = connection.execute(
            "SELECT event_type FROM domain_events WHERE case_id = ? ORDER BY created_at DESC LIMIT 1",
            (case["id"],),
        ).fetchone()
    assert case_count == 1
    assert event["event_type"] == "CaseDeleted"


def test_unit_of_work_rolls_back(database):
    with pytest.raises(sqlite3.IntegrityError):
        with database.unit_of_work() as connection:
            connection.execute(
                """
                INSERT INTO audit_events(id, case_id, action, actor, details_json, created_at)
                VALUES ('one', NULL, 'test', 'test', '{}', 'now')
                """
            )
            connection.execute(
                """
                INSERT INTO audit_events(id, case_id, action, actor, details_json, created_at)
                VALUES ('one', NULL, 'duplicate', 'test', '{}', 'now')
                """
            )
    with database.connect() as connection:
        count = connection.execute(
            "SELECT count(*) AS n FROM audit_events WHERE id = 'one'"
        ).fetchone()["n"]
    assert count == 0


