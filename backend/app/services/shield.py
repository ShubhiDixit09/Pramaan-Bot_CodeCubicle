from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from typing import Iterable


DISCLAIMER = (
    "This is general legal information generated from the cited local corpus, "
    "not a substitute for advice from a qualified lawyer."
)

LEGAL_TERMS = {
    "law", "legal", "court", "police", "fir", "complaint", "notice", "tenant",
    "landlord", "rent", "evict", "challan", "rto", "consumer", "refund", "rti",
    "aadhaar", "property", "marriage", "divorce", "बिना", "कानून", "पुलिस",
    "नोटिस", "किराया", "मकान", "शिकायत", "चालान",
}

INJECTION_PATTERNS = (
    r"ignore (all|any|the|your) previous",
    r"reveal (the )?(system|developer) prompt",
    r"act as (an? )?unrestricted",
    r"bypass (the )?(guard|safety|policy)",
    r"<\|system\|>",
)

PII_PATTERNS = {
    "aadhaar": re.compile(r"\b(?:\d[ -]?){12}\b"),
    "phone": re.compile(r"(?<!\d)(?:\+91[ -]?)?[6-9]\d{9}(?!\d)"),
    "email": re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b"),
    "pan": re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"),
}


@dataclass
class InputGuardResult:
    allowed: bool
    legal_topic: bool
    injection_detected: bool
    masked_text: str
    pii_types: list[str]
    findings: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


def check_input(text: str) -> InputGuardResult:
    lowered = text.lower()
    legal_topic = any(term in lowered for term in LEGAL_TERMS)
    injection = any(re.search(pattern, lowered) for pattern in INJECTION_PATTERNS)
    masked = text
    pii_types = []
    for pii_type, pattern in PII_PATTERNS.items():
        if pattern.search(masked):
            pii_types.append(pii_type)
            masked = pattern.sub(f"[{pii_type.upper()}_MASKED]", masked)
    findings = []
    if not legal_topic:
        findings.append("The query may be outside PRAMAAN BOT's legal-information scope.")
    if injection:
        findings.append("Prompt-injection language was detected and blocked.")
    if pii_types:
        findings.append(f"Masked sensitive fields: {', '.join(pii_types)}.")
    return InputGuardResult(
        allowed=not injection,
        legal_topic=legal_topic,
        injection_detected=injection,
        masked_text=masked,
        pii_types=pii_types,
        findings=findings,
    )


def verify_output(
    answer: str, citations: Iterable[dict], limitations: list[str] | None = None
) -> dict:
    citations = list(citations)
    limitations = limitations or []
    cited_sections = {
        match.group(1).lower()
        for item in citations
        if (match := re.search(r"\bsection\s+(\d+[a-z]?(?:\([a-z0-9]+\))?)", item.get("section", ""), re.I))
    }
    answer_sections = re.findall(r"(?:section|धारा)\s+(\d+[a-z]?(?:\([a-z0-9]+\))?)", answer, re.I)
    mentioned = sum(
        1
        for item in citations
        if item.get("act", "").lower() in answer.lower()
        and item.get("section", "").lower() in answer.lower()
    )
    citation_coverage = mentioned / len(citations) if citations else 0.0
    disclaimer_present = DISCLAIMER.lower() in answer.lower()
    unsupported = [section for section in answer_sections if section.lower() not in cited_sections]
    grounding = (
        (len(answer_sections) - len(unsupported)) / len(answer_sections)
        if answer_sections else 0.0
    )
    pii_safe = not any(pattern.search(answer) for pattern in PII_PATTERNS.values())
    base_score = (
        (citation_coverage * 0.4 + grounding * 0.35 + float(pii_safe) * 0.15 + float(disclaimer_present) * 0.1)
        * 100
    )
    score = round(max(0.0, base_score - 15 * len(limitations)), 1)
    if not citations:
        score = 0.0
    findings = list(limitations)
    if unsupported:
        findings.append(f"Review unsupported section references: {', '.join(unsupported)}")
    if not citations:
        findings.append("No corpus citations were attached.")
    if not answer_sections:
        findings.append("The answer does not identify a section that can be checked against the corpus.")
    if not disclaimer_present:
        findings.append("Required legal-information disclaimer is missing.")
    if not findings:
        findings.append("Section references match attached sources; factual and legal conclusions still need review.")
    return {
        "score": score,
        "citation_coverage": round(citation_coverage * 100, 1),
        "grounding_score": round(grounding * 100, 1),
        "pii_safe": pii_safe,
        "disclaimer_present": disclaimer_present,
        "findings": findings,
    }


def ensure_disclaimer(answer: str) -> str:
    if DISCLAIMER.lower() not in answer.lower():
        return f"{answer.strip()}\n\n{DISCLAIMER}"
    return answer


