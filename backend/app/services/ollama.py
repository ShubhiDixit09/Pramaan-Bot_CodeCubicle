from __future__ import annotations

import json
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


class OllamaClient:
    def __init__(self, base_url: str, model: str):
        self.base_url = base_url.rstrip("/")
        self.model = model
        host = (urlparse(self.base_url).hostname or "").lower()
        if host not in {"127.0.0.1", "localhost", "::1"}:
            raise ValueError("Ollama must use a loopback URL; remote model endpoints are forbidden")

    def status(self) -> dict:
        try:
            with urlopen(f"{self.base_url}/api/tags", timeout=1.5) as response:
                payload = json.loads(response.read())
            models = [item.get("name") for item in payload.get("models", [])]
            return {"available": True, "configured_model": self.model, "models": models}
        except (URLError, TimeoutError, OSError, json.JSONDecodeError):
            return {"available": False, "configured_model": self.model, "models": []}

    def generate(self, prompt: str) -> str | None:
        payload = json.dumps(
            {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.15, "top_p": 0.85},
            }
        ).encode()
        request = Request(
            f"{self.base_url}/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=90) as response:
                return json.loads(response.read()).get("response", "").strip() or None
        except (URLError, TimeoutError, OSError, json.JSONDecodeError):
            return None


