from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class CaseCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=10, max_length=10_000)
    jurisdiction: str = Field(default="Delhi", max_length=100)
    language: Literal["English", "Hindi", "Hinglish"] = "Hinglish"
    urgency: Literal["low", "medium", "high"] = "medium"


class CasePatch(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    description: str | None = Field(default=None, min_length=10, max_length=10_000)
    jurisdiction: str | None = Field(default=None, max_length=100)
    status: Literal["new", "active", "drafting", "resolved", "archived"] | None = None
    expected_revision: int
    idempotency_key: str = Field(min_length=8, max_length=160)


class ChatRequest(BaseModel):
    message: str = Field(min_length=3, max_length=10_000)
    language: Literal["English", "Hindi", "Hinglish"] = "Hinglish"
    idempotency_key: str = Field(min_length=8, max_length=160)


class DraftRequest(BaseModel):
    document_type: Literal["legal_notice", "fir_complaint", "rti_application", "consumer_complaint"]
    recipient: str = Field(default="The Appropriate Authority", max_length=300)
    requested_relief: str = Field(default="Appropriate relief under applicable law", max_length=2_000)
    idempotency_key: str = Field(min_length=8, max_length=160)


class ProcedureStart(BaseModel):
    procedure_id: str
    idempotency_key: str = Field(min_length=8, max_length=160)


class ProcedureStepPatch(BaseModel):
    completed: bool
    idempotency_key: str = Field(min_length=8, max_length=160)


class AnalysisResult(BaseModel):
    intent: dict[str, Any]
    answer: str
    next_steps: list[str]
    citations: list[dict[str, Any]]
    guardrails: dict[str, Any]
    trust_report: dict[str, Any]
    model_mode: str


