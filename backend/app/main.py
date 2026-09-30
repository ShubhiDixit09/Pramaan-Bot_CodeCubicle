from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .connectors import search_india_code
from .data import CHANGES, EVIDENCE, MISSIONS, RECORDS, REVIEWS, RUN_EVENTS, SOURCES


app = FastAPI(
    title="Pramaan Evidence API",
    version="0.1.0",
    description="Mission, evidence, dataset and public-source intelligence API.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MissionCreate(BaseModel):
    prompt: str = Field(min_length=20, max_length=10_000)


class ReviewDecision(BaseModel):
    decision: str = Field(pattern="^(accept|reject|investigate)$")
    note: str = Field(default="", max_length=2_000)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "product": "Pramaan",
        "mode": "verified-only",
        "capabilities": ["missions", "datasets", "provenance", "changes", "review", "india-code"],
    }


@app.get("/api/overview")
def overview() -> dict:
    return {
        "metrics": {
            "active_missions": 0,
            "sources_monitored": 0,
            "changes_today": 0,
            "open_conflicts": 0,
            "coverage": 0,
        },
        "missions": MISSIONS,
        "events": RUN_EVENTS,
    }


@app.get("/api/missions")
def list_missions() -> list[dict]:
    return MISSIONS


@app.post("/api/missions", status_code=201)
def create_mission(payload: MissionCreate) -> dict:
    return {
        "id": f"mis-{uuid4().hex[:10]}",
        "name": "Untitled intelligence mission",
        "prompt": payload.prompt,
        "status": "draft",
        "coverage": 0,
        "record_count": 0,
        "change_count": 0,
        "plan": {
            "entity": "opportunity",
            "fields": ["organisation", "opportunity", "deadline", "eligibility", "value", "location", "official_source"],
            "connectors": ["official_web", "rss", "pdf"],
            "validation": ["Official source preferred", "Typed date validation", "Conflict preservation"],
            "refresh": "Every 6 hours",
        },
    }


@app.get("/api/datasets/opportunities/records")
def dataset_records(
    query: str = "",
    status: str = "all",
    changed_only: bool = False,
) -> dict:
    rows = RECORDS
    if query:
        needle = query.casefold()
        rows = [row for row in rows if needle in " ".join(str(value) for value in row.values()).casefold()]
    if status != "all":
        rows = [row for row in rows if row["status"].casefold() == status.casefold()]
    if changed_only:
        rows = [row for row in rows if row["changed"]]
    return {
        "dataset": "India AI Opportunity Radar",
        "version": 0,
        "published": None,
        "coverage": 0,
        "data_mode": "verified_only",
        "total": len(rows),
        "records": rows,
    }


@app.get("/api/records/{record_id}/evidence")
def record_evidence(record_id: str) -> dict:
    evidence = EVIDENCE.get(record_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="No verified evidence exists for this record")
    return evidence


@app.get("/api/changes")
def list_changes() -> list[dict]:
    return CHANGES


@app.get("/api/reviews")
def list_reviews() -> list[dict]:
    return REVIEWS


@app.post("/api/reviews/{review_id}/decision")
def decide_review(review_id: str, payload: ReviewDecision) -> dict:
    if not any(item["id"] == review_id for item in REVIEWS):
        raise HTTPException(status_code=404, detail="Review item not found")
    return {"id": review_id, "status": payload.decision, "note": payload.note}


@app.get("/api/sources")
def list_sources() -> list[dict]:
    return SOURCES


@app.get("/api/intelligence/legal/search")
async def legal_search(q: str = Query(min_length=2, max_length=300), limit: int = Query(10, ge=1, le=25)) -> dict:
    try:
        results = await search_india_code(q, limit)
        return {"query": q, "source": "India Code", "live": True, "results": results}
    except Exception as exc:
        return {
            "query": q,
            "source": "India Code",
            "live": False,
            "results": [],
            "error": f"Official source unavailable: {type(exc).__name__}",
        }
