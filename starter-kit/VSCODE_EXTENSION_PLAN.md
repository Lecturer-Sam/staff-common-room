# Milestone 2 — VS Code extension (BUILT)

Status: **implemented and packaged** (`vscode-extension/`, ≈20 KB `.vsix`).
Milestone 1 (`agent.py`) is the backend; the extension adds no agent logic.

Build once, then install:

```powershell
cd C:\Users\KING\dev-area\my-editor-agent\vscode-extension
npm install
npm run package        # → beacon-agent-0.1.0.vsix
```

Step-by-step (with prerequisites) lives in `SETUP_GUIDE.md` ▸ Step 9 and
`vscode-extension/README.md`.

## Architecture (as built)

```
┌──────────────────────── VS Code ────────────────────────┐
│  Activity bar ▸ Beacon Agent side panel (webview)       │
│    chat history · diff cards · Approve/Deny · mode ▾    │
│    auto-apply ☐                                         │
│  Extension host (TypeScript, no agent logic):           │
│    ChatViewProvider  draws events, routes clicks        │
│    AgentSession      spawns python, NDJSON in/out       │
│    DiffContentProvider  serves both sides to vscode.diff│
└────────────────────────────┬────────────────────────────┘
                             │  stdin/stdout NDJSON
                             ▼
              python agent.py --json --cwd <folder>
                             │
                             ▼
              Local Ollama @ localhost:11434
```

One Python process per chat: the first message starts it, follow-ups reuse it
(conversation memory survives), `New chat` sends `reset`, and changing model /
mode / auto-approve restarts it lazily. Spawn-per-chat with `keep_alive=30m`
was fast enough in testing; a persistent daemon (2b) is not needed yet.

## Wire protocol (`agent.py --json`)

**Extension → Python** (one JSON object per line on stdin)

| Line | Meaning |
|---|---|
| `{"task": "..."}` | start a task (multi-turn; history is kept) |
| `{"decision": "approve"}` / `{"decision": "deny"}` | answer the pending action |
| `{"type": "cancel"}` | abandon the current task |
| `{"type": "reset"}` | forget the conversation (keeps the skill) |
| `{"type": "set_mode", "mode": "beacon"}` | switch skill live |

**Python → Extension** (NDJSON on stdout)

| Event | Payload used by the panel |
|---|---|
| `ready` | model, workspace, mode, mock, auto_approve |
| `thinking` | show the spinner |
| `action` | action, path, need_approval, old/new/diff, added/removed, error |
| `result` | ok, text (tool output, collapsible) |
| `message` | final assistant text |
| `error` | human-readable failure (never a stack trace) |
| `mode` / `reset` / `done` | mode switch · memory cleared · task finished |

`preview_action()` computes the diff **without touching disk**; the new file
content travels in the event and is rendered by `vscode.diff`
(`beacon-diff:` virtual documents, left = file on disk, right = proposal).

## Safety model (unchanged from M1, now clickable)

* Every `write`/`edit` renders a diff and waits for **Approve**; `auto-apply`
  skips the click for file changes only.
* **Shell commands always ask**, even with auto-approve on.
* `executor.py`'s allowlist is a second gate: `npm install` is refused by the
  agent (G1 wants `yarn`), `rm -rf` and friends are blocked outright.
* Reads never ask. All paths stay inside the opened folder (`file_ops.py`).

## Acceptance

| Criterion | Status |
|---|---|
| Select code → “explain this” → answer in the panel | Implemented (`Beacon: Ask About Selection`, Ctrl+Alt+A) — verify live |
| “add a test for X” → diff preview → Approve applies the edit | Implemented + covered by the protocol harness — verify live |
| `npm install` refused (G1) with a yarn correction | Allowlist blocks it; wording comes from the skill — verify live |
| Works with Ollama stopped (mock reply, no crash) | Covered: `run_task()` falls back to `mock_reply`, no exception path |
| Offline UI demo (no model at all) | `Beacon: Run Offline UI Demo` → scripted brain proposes `agent_demo.py` |

## What was verified where

* **Sandbox (automated):** `tsc` clean; 33/33 Python tests (`test_agent.py`,
  incl. 5 new JSON-session tests); a Node harness driving the real child
  process — approve writes the file, deny leaves disk untouched, second task
  reuses the process, `set_mode`/`reset`/`cancel` work; panel HTML + inline
  webview script parse and agree on element ids; `npm run package` produces a
  9-file `.vsix`.
* **Your machine (manual):** the four acceptance rows above, with Ollama
  running and with it stopped.

## Milestone 2b (only if it ever feels slow)

* Persistent stdio server (no re-spawn per chat) + streaming tokens into the panel.
* Inline diff viewer inside the panel (file-tree aware).
* Approval for shell commands with a “remember this command” allowlist.
* Optional publish to the Marketplace so other machines can install directly.
