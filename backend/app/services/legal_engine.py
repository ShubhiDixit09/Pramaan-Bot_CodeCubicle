from __future__ import annotations

import re
import sqlite3
from typing import Any
from uuid import uuid4

from ..database import Database, utc_now
from .ollama import OllamaClient
from .rag import LegalCorpus
from .shield import check_input, ensure_disclaimer, verify_output


INTENTS = (
    ("tenancy", "eviction_or_deposit", ("landlord", "tenant", "rent", "evict", "deposit", "मकान", "किराया")),
    ("consumer", "defective_goods_or_refund", ("consumer", "refund", "product", "service", "warranty")),
    ("information", "right_to_information", ("rti", "information", "public authority")),
    ("traffic", "traffic_challan", ("challan", "traffic", "vehicle", "rto", "चालान")),
    ("criminal", "police_complaint", ("fir", "police", "crime", "threat", "पुलिस", "शिकायत")),
)


class LegalEngine:
    def __init__(self, database: Database, corpus: LegalCorpus, ollama: OllamaClient):
        self.database = database
        self.corpus = corpus
        self.ollama = ollama

    @staticmethod
    def classify(text: str) -> dict[str, Any]:
        lowered = text.lower()
        for domain, issue, terms in INTENTS:
            hits = sum(term in lowered for term in terms)
            if hits:
                return {
                    "domain": domain,
                    "issue": issue,
                    "confidence": round(min(0.95, 0.55 + hits * 0.12), 2),
                }
        return {"domain": "general", "issue": "legal_information", "confidence": 0.45}

    def analyze(
        self, case_id: str, message: str, language: str, idempotency_key: str
    ) -> dict[str, Any]:
        cached = self.database.cached_response(idempotency_key)
        if cached:
            return cached
        guards = check_input(message)
        if not guards.allowed:
            result = {
                "intent": self.classify(message),
                "answer": ensure_disclaimer(
                    "I could not process this request because it contains instructions that attempt to override safety controls."
                ),
                "next_steps": ["Rewrite the legal question without system or prompt-control instructions."],
                "citations": [],
                "guardrails": guards.to_dict(),
                "trust_report": {
                    "score": 45.0,
                    "citation_coverage": 0.0,
                    "grounding_score": 100.0,
                    "pii_safe": True,
                    "disclaimer_present": True,
                    "findings": guards.findings,
                },
                "model_mode": "blocked",
            }
            with self.database.unit_of_work() as connection:
                Database.store_response(
                    connection, idempotency_key, "case.analyze.blocked", result
                )
            return result

        intent = self.classify(guards.masked_text)
        citations = self.corpus.search(guards.masked_text, limit=4)
        prompt = self._prompt(guards.masked_text, language, intent, citations)
        answer = self.ollama.generate(prompt)
        mode = "ollama"
        if not answer:
            answer = self._grounded_fallback(guards.masked_text, intent, citations, language)
            mode = "deterministic-fallback"
        answer = ensure_disclaimer(answer)
        trust = verify_output(answer, citations)
        next_steps = self._next_steps(intent)
        result = {
            "intent": intent,
            "answer": answer,
            "next_steps": next_steps,
            "citations": citations,
            "guardrails": guards.to_dict(),
            "trust_report": trust,
            "model_mode": mode,
        }
        self._persist(
            case_id,
            intent,
            citations,
            answer,
            next_steps,
            trust,
            idempotency_key,
            result,
        )
        return result

    @staticmethod
    def _prompt(
        query: str, language: str, intent: dict[str, Any], citations: list[dict[str, Any]]
    ) -> str:
        context = "\n\n".join(
            f"[{item['act']} — {item['section']}] {item['text']}" for item in citations
        )
        return f"""You are PRAMAAN BOT, an offline Indian legal-information assistant.
Answer in clear {language}. Use only the supplied legal context. Never invent a
section, deadline, fee, court, or factual detail. Separate known facts from
assumptions. Give a short explanation followed by actionable numbered steps.
Cite provisions exactly as Act — Section. Do not expose hidden reasoning.

Detected intent: {intent}
Citizen query: {query}

LOCAL LEGAL CONTEXT:
{context or "No matching local provision was retrieved."}
"""

    @staticmethod
    def _grounded_fallback(
        query: str, intent: dict[str, Any], citations: list[dict[str, Any]], language: str
    ) -> str:
        if not citations:
            return (
                "The local corpus does not contain enough matching material to answer this safely. "
                "Record the dates, documents and authority involved, then consult the relevant legal-aid office."
            )
        provisions = "; ".join(f"{item['act']} — {item['section']}" for item in citations[:3])
        summaries = " ".join(item["text"] for item in citations[:2])
        prefix = (
            "आपकी बात से यह एक कानूनी प्रक्रिया से जुड़ा मामला लगता है।"
            if language == "Hindi"
            else "Your description appears to involve a legal procedure."
        )
        return (
            f"{prefix} The closest provisions in the local corpus are {provisions}. "
            f"{summaries}\n\nKeep copies of the relevant documents and dates. Send a written complaint "
            "or representation to the responsible authority, retain acknowledgement, and escalate "
            "through the applicable forum if the authority does not respond."
        )

    @staticmethod
    def _next_steps(intent: dict[str, Any]) -> list[str]:
        common = ["Preserve notices, receipts, messages and a dated timeline."]
        by_domain = {
            "tenancy": [
                "Check the tenancy agreement and applicable state rent law.",
                "Send a written notice stating the facts and relief requested.",
                "Contact the District Legal Services Authority if representation is unaffordable.",
            ],
            "consumer": [
                "Write to the seller or service provider and keep proof of delivery.",
                "Compile invoice, warranty and payment records.",
                "Use the consumer grievance/commission process if unresolved.",
            ],
            "information": [
                "Identify the correct public authority and Public Information Officer.",
                "Ask for existing records in precise, numbered points.",
                "Keep the application receipt for a possible first appeal.",
            ],
            "traffic": [
                "Verify the challan number, issuing authority, offence and deadline.",
                "Preserve the notice and vehicle documents.",
                "Use only the authority's official payment or contest channel.",
            ],
            "criminal": [
                "Write a factual chronology without speculation.",
                "Preserve evidence and obtain acknowledgement of the complaint.",
                "For immediate danger, contact local emergency services.",
            ],
        }
        return common + by_domain.get(
            intent["domain"],
            ["Identify the responsible authority and seek qualified legal help for case-specific advice."],
        )

    def _persist(
        self,
        case_id: str,
        intent: dict[str, Any],
        citations: list[dict[str, Any]],
        answer: str,
        steps: list[str],
        trust: dict[str, Any],
        idempotency_key: str,
        result: dict[str, Any],
    ) -> None:
        with self.database.unit_of_work() as connection:
            connection.execute(
                """
                INSERT INTO legal_issues(id, case_id, domain, issue_type, confidence, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (str(uuid4()), case_id, intent["domain"], intent["issue"], intent["confidence"], utc_now()),
            )
            for item in citations:
                law_id = str(uuid4())
                connection.execute(
                    """
                    INSERT INTO applicable_laws(
                        id, case_id, act_name, section, relevance, corpus_ref, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        law_id,
                        case_id,
                        item["act"],
                        item["section"],
                        item["relevance"],
                        item["id"],
                        utc_now(),
                    ),
                )
                connection.execute(
                    """
                    INSERT INTO citations(
                        id, case_id, law_id, citation_text, source_url, jurisdiction, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid4()),
                        case_id,
                        law_id,
                        f"{item['act']} — {item['section']}",
                        item.get("source_url"),
                        item.get("jurisdiction", "India"),
                        utc_now(),
                    ),
                )
            connection.execute(
                """
                INSERT INTO strategies(id, case_id, summary, steps_json, risk_level, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (str(uuid4()), case_id, answer, Database.encode(steps), "review-required", utc_now()),
            )
            connection.execute(
                """
                INSERT INTO trust_reports(
                    id, case_id, score, citation_coverage, grounding_score,
                    pii_safe, disclaimer_present, findings_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid4()),
                    case_id,
                    trust["score"],
                    trust["citation_coverage"],
                    trust["grounding_score"],
                    int(trust["pii_safe"]),
                    int(trust["disclaimer_present"]),
                    Database.encode(trust["findings"]),
                    utc_now(),
                ),
            )
            Database.store_response(
                connection, idempotency_key, "case.analyze", result
            )


