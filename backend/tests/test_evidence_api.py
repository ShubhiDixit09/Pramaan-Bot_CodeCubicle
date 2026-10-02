from dataclasses import replace

from fastapi.testclient import TestClient

from app import main
from app.repositories import CaseRepository


def test_evidence_upload_retains_original_for_local_download(database, tmp_path, monkeypatch):
    repository = CaseRepository(database)
    case = repository.create({
        "title": "Deposit question",
        "description": "My landlord has not returned my security deposit.",
        "jurisdiction": "Delhi",
        "language": "English",
        "urgency": "medium",
    })
    monkeypatch.setattr(main, "database", database)
    monkeypatch.setattr(main, "repository", repository)
    monkeypatch.setattr(main, "settings", replace(main.settings, evidence_dir=tmp_path / "evidence"))

    with TestClient(main.app) as client:
        upload = client.post(
            f"/api/cases/{case['id']}/evidence",
            files={"file": ("receipt.txt", b"Paid 25000 on 1 July 2025", "text/plain")},
        )
        assert upload.status_code == 201
        payload = upload.json()
        assert payload["stored_locally"] is True
        assert payload["vision_status"] == "Text extracted locally"

        download = client.get(f"/api/cases/{case['id']}/evidence/{payload['id']}/file")
        assert download.status_code == 200
        assert download.content == b"Paid 25000 on 1 July 2025"
        assert repository.related(case["id"])["evidence"][0]["sha256"]
