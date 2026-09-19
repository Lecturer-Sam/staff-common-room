# Milestone 2 — VS Code extension (plan, not yet built)

Milestone 1 (`agent/agent.py`) is the backend. The extension is a thin
frontend over it — no agent logic is duplicated in TypeScript.

## Architecture

```
┌──────────────────────────── VS Code ────────────────────────────┐
│  Side panel (webview): chat + mode badge + approve/deny buttons │
│  Extension host (TypeScript):                                   │
│    - spawns `python3 agent/agent.py --once "<task>" --cwd <ws>` │
│    - streams stdout back into the panel                         │
│    - shows diffs for write/edit before applying (preview)       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              Local Ollama @ localhost:11434
              (qwen2.5-coder:14b, same as prototype)
```

Why `--once` + subprocess first: zero new protocol to invent, identical
behaviour to the terminal loop, and the allowlist/approval logic stays in
one place (Python). A persistent stdio/HTTP server is Milestone 2b, only
if spawn-per-task feels slow.

## Build steps

1. `yo code` (or manual scaffold) → `vscode-extension/` with
   `package.json` (activation: `onStartupFinished`), `src/extension.ts`.
2. Command `beaconAgent.ask` — takes selected text + prompt, shells out to
   `agent.py --once`, shows the reply in the panel.
3. Webview panel `beaconAgent.chat` — input box, history, mode indicator
   (auto/beacon/general), approve/deny buttons wired to stdin of the agent.
4. Diff preview: intercept `write`/`edit` proposals and show them with
   `vscode.diff` before the user approves.
5. Setting `beaconAgent.model` (default `qwen2.5-coder:14b`) and
   `beaconAgent.mode` (`auto`/`beacon`/`general`).
6. Package with `vsce package` → install the `.vsix` locally. No marketplace
   publish needed for a personal editor.

## Acceptance

- [ ] Select code → ask "explain this" → answer appears in panel.
- [ ] Ask "add a test for X" → diff preview appears → approve applies the edit.
- [ ] `npm install` suggestion is refused (G1) with a yarn correction.
- [ ] Works with Ollama stopped (mock reply, no crash).
