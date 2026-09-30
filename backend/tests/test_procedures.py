from app.config import settings
from app.repositories import CaseRepository
from app.services.procedures import ProcedureService


def test_procedure_is_resumable(database):
    case = CaseRepository(database).create(
        {
            "title": "Consumer refund issue",
            "description": "The seller has not refunded a defective product.",
            "jurisdiction": "Delhi",
            "language": "English",
            "urgency": "medium",
        }
    )
    service = ProcedureService(database, settings.procedures_path)
    run = service.start(case["id"], "consumer-complaint", "procedure-key-0001")
    updated = service.update_step(
        run["run_id"], "collect", True, "procedure-step-key-0001"
    )
    assert updated["progress"] == 20
    assert updated["steps"][0]["completed"] is True


