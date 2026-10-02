from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent


@dataclass(frozen=True)
class Settings:
    host: str = os.getenv("PRAMAAN_HOST", "127.0.0.1")
    port: int = int(os.getenv("PRAMAAN_PORT", "8000"))
    db_path: Path = Path(os.getenv("PRAMAAN_DB_PATH", PROJECT_ROOT / "data" / "pramaan.db"))
    db_key: str | None = os.getenv("PRAMAAN_DB_KEY") or None
    ollama_url: str = os.getenv("PRAMAAN_OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
    ollama_model: str = os.getenv("PRAMAAN_OLLAMA_MODEL", "gemma3:4b")
    cors_origins: tuple[str, ...] = tuple(
        value.strip()
        for value in os.getenv(
            "PRAMAAN_CORS_ORIGINS",
            "http://localhost:5174,http://127.0.0.1:5174",
        ).split(",")
        if value.strip()
    )
    legal_corpus_path: Path = BACKEND_ROOT / "data" / "legal_corpus.json"
    procedures_path: Path = BACKEND_ROOT / "data" / "procedures.json"
    courts_path: Path = BACKEND_ROOT / "data" / "courts.json"
    output_dir: Path = PROJECT_ROOT / "data" / "generated"
    evidence_dir: Path = PROJECT_ROOT / "data" / "evidence"


settings = Settings()


