"""File operations confined to the repo root.

Every read/write/edit resolves the path and refuses to escape REPO_ROOT,
so the LLM can never touch files outside the project.
"""

from __future__ import annotations

from pathlib import Path

AGENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = AGENT_DIR.parent


def safe_path(rel: str, repo_root: Path | None = None) -> Path:
    root = (repo_root or REPO_ROOT).resolve()
    p = (root / rel).resolve()
    if p != root and root not in p.parents:
        raise PermissionError(f"Refused: {rel!r} escapes the repo root")
    return p


def read_file(rel: str, repo_root: Path | None = None, max_chars: int = 20000) -> str:
    p = safe_path(rel, repo_root)
    if not p.is_file():
        raise FileNotFoundError(f"No such file: {rel}")
    text = p.read_text(encoding="utf-8", errors="replace")
    if len(text) > max_chars:
        text = text[:max_chars] + f"\n…[truncated {len(text) - max_chars} chars]"
    return text


def write_file(rel: str, content: str, repo_root: Path | None = None) -> str:
    p = safe_path(rel, repo_root)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return f"wrote {len(content)} chars to {rel}"


def edit_file(rel: str, old_text: str, new_text: str,
              repo_root: Path | None = None) -> str:
    p = safe_path(rel, repo_root)
    if not p.is_file():
        raise FileNotFoundError(f"No such file: {rel}")
    text = p.read_text(encoding="utf-8", errors="replace")
    if old_text not in text:
        raise ValueError(f"old_text not found in {rel} (exact match required)")
    text = text.replace(old_text, new_text, 1)
    p.write_text(text, encoding="utf-8")
    return f"edited {rel}: replaced 1 occurrence ({len(old_text)} → {len(new_text)} chars)"
