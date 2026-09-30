from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any


TOKEN_RE = re.compile(r"[\w\u0900-\u097F]+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    return [token.lower() for token in TOKEN_RE.findall(text) if len(token) > 1]


class LegalCorpus:
    """Offline hierarchical retrieval with no network dependency.

    The lightweight TF-IDF fallback is always available. A ChromaDB adapter can
    replace `search` without changing the API when local embeddings are installed.
    """

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.documents: list[dict[str, Any]] = json.loads(self.path.read_text(encoding="utf-8"))
        self._doc_tokens = [tokenize(self._search_text(doc)) for doc in self.documents]
        doc_frequency = Counter(token for tokens in self._doc_tokens for token in set(tokens))
        count = len(self.documents)
        self._idf = {
            token: math.log((count + 1) / (frequency + 1)) + 1
            for token, frequency in doc_frequency.items()
        }

    @staticmethod
    def _search_text(document: dict[str, Any]) -> str:
        return " ".join(
            str(document.get(key, ""))
            for key in ("act", "section", "title", "text", "keywords", "jurisdiction")
        )

    def search(
        self,
        query: str,
        limit: int = 5,
        domain: str | None = None,
        issue: str | None = None,
        jurisdiction: str | None = None,
    ) -> list[dict[str, Any]]:
        query_tokens = Counter(tokenize(query))
        if not query_tokens:
            return []

        # Hierarchical boost: first identify matching Acts, then rank sections.
        act_scores: Counter[str] = Counter()
        for document, tokens in zip(self.documents, self._doc_tokens):
            if domain and domain not in document.get("domains", []):
                continue
            if issue and issue not in document.get("issues", []):
                continue
            if jurisdiction and document.get("jurisdiction") not in ("India", jurisdiction):
                continue
            overlap = sum(query_tokens[token] * self._idf.get(token, 0) for token in set(tokens))
            act_scores[document["act"]] += overlap
        preferred_acts = {name for name, _ in act_scores.most_common(3)}

        ranked = []
        for document, tokens in zip(self.documents, self._doc_tokens):
            if domain and domain not in document.get("domains", []):
                continue
            if issue and issue not in document.get("issues", []):
                continue
            if jurisdiction and document.get("jurisdiction") not in ("India", jurisdiction):
                continue
            token_counts = Counter(tokens)
            numerator = sum(
                query_tokens[token] * token_counts[token] * self._idf.get(token, 0) ** 2
                for token in query_tokens
            )
            query_norm = math.sqrt(
                sum((count * self._idf.get(token, 0)) ** 2 for token, count in query_tokens.items())
            )
            doc_norm = math.sqrt(
                sum((count * self._idf.get(token, 0)) ** 2 for token, count in token_counts.items())
            )
            score = numerator / (query_norm * doc_norm) if query_norm and doc_norm else 0
            if document["act"] in preferred_acts:
                score *= 1.12
            if score > 0:
                ranked.append((score, document))

        ranked.sort(key=lambda item: item[0], reverse=True)
        return [
            {**document, "relevance": round(min(score, 1.0) * 100, 1)}
            for score, document in ranked[:limit]
        ]


