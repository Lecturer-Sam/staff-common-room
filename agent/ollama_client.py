"""Thin Ollama client with graceful mock fallback.

The sandbox / CI machines running this prototype usually have no Ollama
daemon, so every network call must fail soft and let the agent loop
continue in --mock mode.
"""

from __future__ import annotations

import json

try:
    import requests
except ImportError:  # pragma: no cover - requirements not installed
    requests = None


class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434",
                 model: str = "qwen2.5-coder:14b",
                 timeout: int = 120):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def is_available(self) -> bool:
        if requests is None:
            return False
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=3)
            return r.status_code == 200
        except Exception:
            return False

    def chat(self, messages: list[dict], model: str | None = None) -> str:
        """Call /api/chat (non-streaming) and return the assistant text."""
        if requests is None:
            raise RuntimeError("requests is not installed (pip install -r agent/requirements.txt)")
        payload = {
            "model": model or self.model,
            "messages": messages,
            "stream": False,
        }
        r = requests.post(f"{self.base_url}/api/chat", json=payload, timeout=self.timeout)
        r.raise_for_status()
        data = r.json()
        try:
            return data["message"]["content"]
        except KeyError:
            raise RuntimeError(f"Unexpected Ollama response: {json.dumps(data)[:500]}")


def mock_reply(user_query: str, mode: str) -> str:
    """Deterministic fallback when Ollama is unreachable.

    Returns plain-text guidance (no action) so the loop stays safe.
    """
    return (
        f"[mock brain — Ollama unreachable, mode={mode}]\n"
        f"You asked: {user_query!r}\n\n"
        "Start Ollama (`ollama serve` + `ollama pull qwen2.5-coder:14b`) "
        "to get live code actions. Meanwhile, tell me which file to read "
        "and I will show you the exact JSON action I *would* send, e.g.:\n"
        '{"action": "read", "path": "README.md"}'
    )
