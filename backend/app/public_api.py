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
        "ai_assist_configured": bool(__import__("os").getenv("GEMINI_API_KEY") or __import__("os").getenv("GOOGLE_API_KEY")),
        "corpus_documents": len(corpus.documents),
        "ollama": {"available": False, "configured_model": "not-enabled", "models": []},
        "case_storage": "encrypted_browser_only",
        "case_storage_note": "The hosted API cannot read or store private browser vault records. No cross-device sync.",
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


# Generative assistance is a separate, explicitly consented public request.
# Private case data and evidence never leave the encrypted browser vault.
import os
import httpx
from fastapi import Request
from pydantic import BaseModel, Field


class PublicAssistRequest(BaseModel):
    question: str = Field(min_length=6, max_length=500)
    language: str = Field(default="English", pattern="^(English|Hindi|Hinglish)$")
    consent: bool


@app.post("/api/assist")
async def public_ai_assist(payload: PublicAssistRequest, request: Request) -> dict:
    if not payload.consent:
        raise HTTPException(status_code=400, detail="Consent is required before sending a generic question to the external AI provider.")

    guard = check_input(payload.question)
    if not guard.allowed:
        raise HTTPException(status_code=400, detail="Prompt-control instructions are not permitted.")
    if guard.pii_types:
        raise HTTPException(
            status_code=400,
            detail="Remove personal identifiers (phone, email, Aadhaar or PAN) and rewrite as a generic legal question.",
        )
    if not guard.legal_topic:
        raise HTTPException(status_code=400, detail="Ask a specific question about Indian law, such as consumer refunds or tenancy.")

    sources = corpus.search(guard.masked_text, 4)
    if not sources:
        raise HTTPException(
            status_code=422,
            detail="This prototype's small legal corpus has no matching sources. Try the source search instead.",
        )

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Legal AI model is not yet configured.")

    model = os.getenv("PRAMAAN_GEMINI_MODEL", "gemini-3.5-flash-lite")
    source_text = "\n".join(
        f"[{i+1}] {src['act']} — {src['section']}: {src['text']}"
        for i, src in enumerate(sources)
    )
    prompt = (
        "You are Pramaan Bot, an educational Indian legal information assistant. "
        "You are not a lawyer. Answer only as far as the provided small curated corpus supports. "
        "Separate general information from unknown facts. NEVER invent legal provisions, "
        "current fees, deadlines, court jurisdiction, or case outcomes. "
        "Use exact Act and Section references from the supplied sources, and clearly say "
        "what cannot be determined without current official texts or a lawyer. "
        "End with a disclaimer that this is general legal information, not legal advice. "
        "Answer in " + payload.language + ".\n\n"
        "Curated source records (unverified for current legal effect):\n" + source_text + "\n\n"
        "Generic question (the user has explicitly consented):\n" + guard.masked_text
    )

    try:
        async with httpx.AsyncClient(timeout=28) as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent",
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": api_key,
                },
                json={
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.15,
                        "maxOutputTokens": 750,
                    },
                },
            )
        if response.status_code in (429, 503):
            raise HTTPException(
                status_code=503, detail="Legal AI usage limit reached; use local source search."
            )
        if response.status_code != 200:
            raise HTTPException(
                status_code=502, detail="AI provider unavailable. No case files were submitted."
            )
        result = response.json()
        answer = "\n".join(
            part.get("text", "")
            for part in result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        ).strip()
        if not answer:
            raise HTTPException(status_code=502, detail="AI returned no legal explanation.")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI provider timed out. Retry or use local source search.") from None
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="AI provider network error.") from None

    return {
        "answer": answer,
        "citations": sources,
        "model_mode": model,
        "data_use": "Only the explicitly submitted generic question and curated source snippets were sent to Google Gemini.",
        "disclaimer": "Not legal advice; verify current law with official sources and a qualified advocate.",
    }



@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    include_in_schema=False,
)
def unavailable_private_case_features(path: str) -> None:
    raise HTTPException(
        status_code=403,
        detail=(
            "Private cases, evidence and drafts are deliberately stored in "
            "the user's encrypted browser vault, not on this public API. "
            "Open the Pramaan Bot website and unlock the local vault."
        ),
    )
