"""Public, read-only Pramaan research API for serverless hosting.

This is deliberately separate from app.main, whose case/evidence endpoints require
authenticated users and persistent encrypted storage. No SQLite case database is
opened, migrated, or exposed by this service.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query

from app.services.rag import LegalCorpus
from app.services.shield import check_input

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
corpus = LegalCorpus(DATA_DIR / "legal_corpus.json")
procedure_data = json.loads((DATA_DIR / "procedures.json").read_text(encoding="utf-8"))
court_data = json.loads((DATA_DIR / "courts.json").read_text(encoding="utf-8"))

app = FastAPI(
    title="Pramaan Bot — Public Legal Research",
    version="1.0.0",
    description=(
        "Read-only legal corpus demonstration. No case files, evidence uploads, "
        "account storage, or local Ollama model are exposed."
    ),
)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "privacy_mode": "public-readonly",
        "corpus_documents": len(corpus.documents),
        "ollama": {"available": False, "configured_model": "not-enabled", "models": []},
        "case_storage": "unavailable",
        "notice": "Public demo only. Do not submit private or identifying case information.",
    }


@app.get("/api/research")
def research(
    query: str = Query(min_length=2, max_length=500),
    limit: int = Query(default=5, ge=1, le=10),
) -> dict:
    guard = check_input(query)
    # Legal source retrieval uses a real TF-IDF ranking algorithm over curated
    # local records; it does not pretend to run a generative language model.
    return {
        "query": guard.masked_text,
        "guardrails": guard.to_dict(),
        "results": corpus.search(guard.masked_text, limit) if guard.allowed else [],
    }


@app.get("/api/procedures")
def procedures() -> list[dict]:
    return procedure_data


@app.get("/api/courts")
def courts(jurisdiction: str | None = None) -> list[dict]:
    if not jurisdiction:
        return court_data
    lowered = jurisdiction.lower()
    return [
        item for item in court_data
        if lowered in item["jurisdiction"].lower()
        or item["jurisdiction"].lower() == "district-specific"
    ]


@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    include_in_schema=False,
)
def unavailable_private_case_features(path: str) -> None:
    raise HTTPException(
        status_code=503,
        detail=(
            "This public demo supports research and guides only. Private case "
            "storage, AI case analysis, evidence, and documents require the "
            "authenticated local or persistent backend."
        ),
    )
