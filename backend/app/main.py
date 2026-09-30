from __future__ import annotations

import hashlib
import json
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import PROJECT_ROOT, settings
from .database import Database, utc_now
from .repositories import CaseRepository, ConflictError, NotFoundError
from .schemas import (
    AnalysisResult,
    CaseCreate,
    CasePatch,
    ChatRequest,
    DraftRequest,
    ProcedureStart,
    ProcedureStepPatch,
)
from .services.drafting import DraftService
from .services.legal_engine import LegalEngine
from .services.ollama import OllamaClient
from .services.procedures import ProcedureService
from .services.rag import LegalCorpus
from .services.shield import check_input


database = Database(settings.db_path, key=settings.db_key)
repository = CaseRepository(database)
corpus = LegalCorpus(settings.legal_corpus_path)
ollama = OllamaClient(settings.ollama_url, settings.ollama_model)
engine = LegalEngine(database, corpus, ollama)
procedures = ProcedureService(database, settings.procedures_path)
drafts = DraftService(database, settings.output_dir)

app = FastAPI(
    title="PRAMAAN BOT Local API",
    version="1.0.0",
    description="Local-first legal action engine. All case data stays on this machine.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    database.migrate()


@app.get("/api/health")
def health() -> dict:
    database.migrate()
    return {
        "status": "ok",
        "database": "connected",
        "storage": database.security_status(),
        "privacy_mode": "local-only",
        "ollama": ollama.status(),
        "corpus_documents": len(corpus.documents),
    }


@app.get("/api/cases")
def list_cases() -> list[dict]:
    return repository.list()


@app.post("/api/cases", status_code=201)
def create_case(payload: CaseCreate) -> dict:
    return repository.create(payload.model_dump())


@app.get("/api/cases/{case_id}")
def get_case(case_id: str) -> dict:
    try:
        case = repository.get(case_id)
        return {**case, "related": repository.related(case_id)}
    except NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.patch("/api/cases/{case_id}")
def update_case(case_id: str, payload: CasePatch) -> dict:
    try:
        values = payload.model_dump(exclude={"expected_revision", "idempotency_key"})
        return repository.update(
            case_id, values, payload.expected_revision, payload.idempotency_key
        )
    except NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.delete("/api/cases/{case_id}")
def delete_case(
    case_id: str,
    expected_revision: int,
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> dict:
    try:
        return repository.tombstone(case_id, expected_revision, idempotency_key)
    except ConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.post("/api/cases/{case_id}/analyze", response_model=AnalysisResult)
def analyze_case(case_id: str, payload: ChatRequest) -> dict:
    try:
        repository.get(case_id)
    except NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return engine.analyze(
        case_id, payload.message, payload.language, payload.idempotency_key
    )


@app.get("/api/research")
def research(query: str, limit: int = 5) -> dict:
    safe_limit = max(1, min(limit, 10))
    guard = check_input(query)
    return {
        "query": guard.masked_text,
        "guardrails": guard.to_dict(),
        "results": corpus.search(guard.masked_text, safe_limit) if guard.allowed else [],
    }


@app.post("/api/cases/{case_id}/evidence", status_code=201)
async def upload_evidence(case_id: str, file: UploadFile = File(...)) -> dict:
    try:
        repository.get(case_id)
    except NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Files are limited to 10 MB")
    media_type = file.content_type or "application/octet-stream"
    extracted = ""
    if media_type.startswith("text/") or Path(file.filename or "").suffix.lower() in {".txt", ".md"}:
        extracted = content.decode("utf-8", errors="replace")[:50_000]
    evidence_id = str(uuid4())
    metadata = {
        "parser": "plain-text" if extracted else "stored-for-local-vision-model",
        "vision_status": (
            "Text extracted locally"
            if extracted
            else "Image/PDF saved as metadata; connect a local vision-capable Ollama model for extraction"
        ),
    }
    with database.unit_of_work() as connection:
        connection.execute(
            """
            INSERT INTO evidence(
                id, case_id, filename, media_type, sha256, extracted_text, metadata_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                evidence_id,
                case_id,
                Path(file.filename or "evidence").name,
                media_type,
                hashlib.sha256(content).hexdigest(),
                extracted,
                Database.encode(metadata),
                utc_now(),
            ),
        )
    return {"id": evidence_id, "filename": file.filename, "media_type": media_type, **metadata}


@app.get("/api/procedures")
def list_procedures() -> list[dict]:
    return procedures.list()


@app.post("/api/cases/{case_id}/procedures", status_code=201)
def start_procedure(case_id: str, payload: ProcedureStart) -> dict:
    try:
        repository.get(case_id)
        return procedures.start(
            case_id, payload.procedure_id, payload.idempotency_key
        )
    except NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.patch("/api/procedure-runs/{run_id}/steps/{step_id}")
def patch_procedure_step(run_id: str, step_id: str, payload: ProcedureStepPatch) -> dict:
    try:
        return procedures.update_step(
            run_id, step_id, payload.completed, payload.idempotency_key
        )
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/api/cases/{case_id}/drafts", status_code=201)
def create_draft(case_id: str, payload: DraftRequest) -> dict:
    try:
        case = repository.get(case_id)
    except NotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return drafts.create(
        case,
        payload.document_type,
        payload.recipient,
        payload.requested_relief,
        payload.idempotency_key,
    )


@app.get("/api/drafts/{draft_id}/pdf")
def export_draft(draft_id: str) -> FileResponse:
    with database.connect() as connection:
        row = connection.execute("SELECT * FROM drafts WHERE id = ?", (draft_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Draft not found")
    draft = dict(row)
    path = drafts.export_pdf(draft)
    return FileResponse(path, media_type="application/pdf", filename=f"{draft_id}.pdf")


@app.get("/api/courts")
def list_courts(jurisdiction: str | None = None) -> list[dict]:
    records = json.loads(settings.courts_path.read_text(encoding="utf-8"))
    if jurisdiction:
        lowered = jurisdiction.lower()
        return [
            record
            for record in records
            if lowered in record["jurisdiction"].lower()
            or record["jurisdiction"].lower() == "district-specific"
        ]
    return records


# The Docker image places the production React build here. API routes are
# registered first, so the static SPA cannot shadow them.
frontend_dist = PROJECT_ROOT / "frontend-dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
