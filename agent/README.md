# Personal editor agent — prototype loop (Milestone 1)

Your locked choices:

| Decision | Choice |
|---|---|
| Editor base | **VS Code extension** (this loop becomes its backend) |
| Brain | **Local Ollama** (`qwen2.5-coder:14b`), mock fallback when unreachable |
| Scope | **General coding + Beacon mode** (strict `SKILL.md` G1–G14 for this repo) |
| Milestone 1 | **Working chat → code loop** (this folder — no UI yet) |

## How it works

```
You type a task ──▶ mode detect (beacon/general) ──▶ system prompt = skill + contract
        │                                                        │
        │                          ┌─────────────────────────────┘
        │                          ▼
        │                   Ollama /api/chat (local)
        │                          │
        │              plain text?  │  ```json action? ──▶ allowlist? ──▶ approve? ──▶ run
        │                  │        │                                          │
        └──────────────────┴────────┴────────── result fed back ───────────────┘
```

- **Beacon mode** loads `data/side/SKILL.md` verbatim + a harness contract
  (read/write/edit/run as single JSON actions). Auto-selected inside this
  repo or when you mention beacon / nacca / curriculum / firestore.
- **General mode** loads `agent/skills/general.md`. Auto-selected elsewhere
  (the later VS Code extension will use this outside Beacon repos).
- `/beacon` and `/general` override the auto-detect at any time.

## Run it

```bash
pip install -r agent/requirements.txt

# On your own machine (Ollama does not run in this sandbox):
ollama serve
ollama pull qwen2.5-coder:14b

# Interactive loop
python3 agent/agent.py

# One-shot (used by scripts, later by the VS Code extension)
python3 agent/agent.py --once "list the repo root and summarise the layout"

# Mock mode — no Ollama needed, shows the loop without live actions
python3 agent/agent.py --mock --once "what would you do?"

# Tests (offline, no Ollama needed)
python3 agent/test_agent.py
```

## Safety

- `executor.py` — allowlist of command prefixes + blocklist
  (`rm -rf`, `DROP TABLE`, force-push…). Non-matching commands are **refused**,
  never executed. `npm install` is refused: the Beacon skill mandates yarn (G1).
- `file_ops.py` — every path is jailed to the repo root. `../../etc/passwd`
  style escapes raise `PermissionError`.
- Every action asks for approval unless you pass `--yes` or toggle `/yes`.
- Command output is capped at 6 KB so the LLM context never explodes.

## Files

| File | Purpose |
|---|---|
| `agent.py` | interactive loop, mode detect, act → observe cycles |
| `ollama_client.py` | thin `/api/chat` wrapper + `mock_reply` fallback |
| `executor.py` | allowlisted shell execution |
| `file_ops.py` | repo-jailed read/write/edit |
| `skills/general.md` | general-mode skill (beacon skill stays in `data/side/SKILL.md`) |
| `test_agent.py` | offline unit tests |
| `VSCODE_EXTENSION_PLAN.md` | Milestone 2 design — the extension that wraps this loop |

## What is deliberately NOT here yet

- No RAG over the 44 curriculum JSONs (Milestone 3 — see `TRAINING A SKILL.md`
  Approach 1; the loop already supports it via a future `search` action).
- No fine-tuning (only if RAG + prompt keeps violating G-rules — Approach 2).
- No VS Code UI yet — see `VSCODE_EXTENSION_PLAN.md` for the exact next step.
