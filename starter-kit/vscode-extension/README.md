# Beacon Agent — VS Code extension (Milestone 2)

A side-panel chat for your local coding agent. It is a **thin frontend**:
all the thinking, file rules and allowlist logic stay in `agent.py`
(starter-kit root). This extension only draws the chat and asks you to
approve or deny proposed changes.

```
VS Code panel  ──spawn──▶  python agent.py --json  ──▶  Ollama (local)
   chat, diff preview,          NDJSON events on stdout
   Approve / Deny               decisions on stdin
```

## 1. Prerequisites

| Need | Check |
| --- | --- |
| The Python kit (this folder's parent) | `agent.py`, `skills/`, `executor.py` … exist |
| Python 3.10+ | `python --version` |
| Ollama with your model | `ollama list` shows `qwen2.5-coder:7b` |
| Node.js 20+ (only to *build* the extension) | `node --version` |

## 2. Build the `.vsix` (one time, ~30 s)

Open a terminal **in this `vscode-extension` folder**:

```
npm install
npm run compile
npm run package
```

`npm run package` writes `beacon-agent-0.1.0.vsix` in this folder.
Then install it:

* VS Code ▸ Extensions ▸ `…` menu (top-right) ▸ **Install from VSIX…** ▸ pick the file, **or**
* `code --install-extension beacon-agent-0.1.0.vsix`

Reload the window. A **Beacon Agent** icon appears in the Activity Bar.

## 3. Point it at your project

1. **File ▸ Open Folder…** and open the project you want to edit
   (`C:\Users\KING\dev-area\my-editor-agent` works — `agent.py` is at its root).
2. If `agent.py` lives somewhere else, set
   **Settings ▸ Extensions ▸ Beacon Agent ▸ Agent Path** to the folder that
   contains it (e.g. `C:\Users\KING\dev-area\my-editor-agent`).
3. Check **Beacon Agent ▸ Python Path** is `python` (use `py` if that is your launcher).

The agent can only read/write/run **inside the opened folder** — that rule
lives in `file_ops.py`, not in the UI.

## 4. Use it

* Click the **Beacon Agent** icon → chat panel.
* Type a task → **Send** (Enter sends, Shift+Enter is a newline).
* When the agent proposes a file change you get a card with **Show diff**,
  **Approve** and **Deny**. The diff opens in VS Code's normal diff viewer
  (left = file on disk, right = proposal); nothing is written until you click
  Approve.
* **Shell commands always ask for approval**, even with auto-apply on. The
  allowlist (`executor.py`) refuses anything risky as a second line of defence.

Commands (Ctrl+Shift+P → “Beacon”):

| Command | What it does |
| --- | --- |
| `Beacon: Ask About Selection` | Select code ▸ Ctrl+Alt+A ▸ describe what you want |
| `Beacon: Ask a Question…` | Quick input box, answer lands in the panel |
| `Beacon: Focus Chat Panel` | Jump to the side panel |
| `Beacon: New Chat` | Clear conversation memory |
| `Beacon: Choose Mode` | `auto` / `beacon` (strict G1–G14) / `general` |
| `Beacon: Toggle Auto-Approve File Changes` | Apply writes/edits without asking |
| `Beacon: Run Offline UI Demo (no Ollama)` | Scripted brain proposes one new file — proves diff + Approve/Deny with Ollama stopped |
| `Beacon: Show Agent Log` | Raw stdout/stderr of the Python child (debugging) |

Settings: `beaconAgent.model`, `.mode`, `.autoApprove`, `.autoOpenDiff`,
`.timeout`, `.maxSteps`, `.ollamaUrl`, `.pythonPath`, `.agentPath`.

## 5. Try this first (2 minutes)

1. `Beacon: Run Offline UI Demo (no Ollama)` → a card for a new file
   `agent_demo.py` appears, the diff opens → **Deny**, then run it again →
   **Approve** → the file opens in the editor. This proves the whole
   approve/deny path without waiting for the model.
2. With Ollama running, ask: `add a test for greet()` → diff → Approve.
3. Ask a Beacon question: `how many indicators are there?` → the answer must
   name the layer (`L1: 3,095 · L2: 13,140 · L3: 4,040 served`), not a
   single "total" — that is Ground Rule G9.

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| “Could not find agent.py” | Set **Agent Path** to the starter-kit folder |
| “Could not start the agent … Python” | Set **Python Path** (`python`, `py`, or full path) |
| “Ollama request failed …” | `ollama serve` is not running, or the first call needs longer — raise **Timeout** (e.g. 900) |
| Panel answers `[mock brain …]` | Ollama unreachable, or the model name in settings ≠ `ollama list` |
| Nothing happens on Send | `Beacon: Show Agent Log` for the raw child output |
| Diff opens but nothing changes on disk | You clicked **Deny**, or `autoApprove` is off and the click did not register on the card |

> The extension spawns a fresh Python process per chat (first message loads the
> model; `keep_alive=30m` keeps it hot). A persistent stdio server is
> Milestone 2b, only if this ever feels slow.
