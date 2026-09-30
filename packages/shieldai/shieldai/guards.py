from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Iterable


DEFAULT_PII_PATTERNS = {
    "aadhaar": r"\b(?:\d[ -]?){12}\b",
    "phone": r"(?<!\d)(?:\+91[ -]?)?[6-9]\d{9}(?!\d)",
    "email": r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b",
    "pan": r"\b[A-Z]{5}\d{4}[A-Z]\b",
}

DEFAULT_INJECTION_PATTERNS = (
    r"ignore (all|any|the|your) previous",
    r"reveal (the )?(system|developer) prompt",
    r"bypass (the )?(guard|safety|policy)",
    r"<\|system\|>",
)


@dataclass(frozen=True)
class GuardResult:
    allowed: bool
    text: str
    pii_types: tuple[str, ...]
    injection_detected: bool
    findings: tuple[str, ...]

    def to_dict(self) -> dict:
        return asdict(self)


class GuardPipeline:
    """Dependency-free guards that can wrap any local or hosted model client."""

    def __init__(
        self,
        pii_patterns: dict[str, str] | None = None,
        injection_patterns: Iterable[str] | None = None,
        required_disclaimer: str | None = None,
    ):
        self.pii_patterns = {
            name: re.compile(pattern)
            for name, pattern in (pii_patterns or DEFAULT_PII_PATTERNS).items()
        }
        self.injection_patterns = tuple(injection_patterns or DEFAULT_INJECTION_PATTERNS)
        self.required_disclaimer = required_disclaimer

    def check_input(self, text: str) -> GuardResult:
        lowered = text.lower()
        injection = any(re.search(pattern, lowered) for pattern in self.injection_patterns)
        masked = text
        pii_types = []
        for name, pattern in self.pii_patterns.items():
            if pattern.search(masked):
                pii_types.append(name)
                masked = pattern.sub(f"[{name.upper()}_MASKED]", masked)
        findings = []
        if injection:
            findings.append("Prompt-injection language detected.")
        if pii_types:
            findings.append(f"Masked: {', '.join(pii_types)}.")
        return GuardResult(
            allowed=not injection,
            text=masked,
            pii_types=tuple(pii_types),
            injection_detected=injection,
            findings=tuple(findings),
        )

    def protect_output(self, text: str) -> str:
        protected = text
        for name, pattern in self.pii_patterns.items():
            protected = pattern.sub(f"[{name.upper()}_MASKED]", protected)
        if self.required_disclaimer and self.required_disclaimer.lower() not in protected.lower():
            protected = f"{protected.rstrip()}\n\n{self.required_disclaimer}"
        return protected


