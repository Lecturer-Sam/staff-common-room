# My Editor Agent (standalone)

Your personal VS Code-style coding agent. You type commands, it writes code —
following a **SKILL** file that encodes your rules.

This project is **fully separate** from `staff-common-room`. It only borrows
one artifact from there: a copy of the Beacon skill (`skills/beacon.md`).

**New here? Start with [`SETUP_GUIDE.md`](SETUP_GUIDE.md)** — it lists every
step in order for a fresh machine.

## Layout

```
my-editor-agent/
├── agent.py           the chat → code loop (terminal loop + editor protocol)
├── ollama_client.py   talks to local Ollama (mock fallback when unreachable)
├── executor.py        allowlisted shell execution (safe `run`)
├── file_ops.py        workspace-jailed read/write/edit
├── skills/
│   ├── general.md     general coding skill (default mode)
│   ├── beacon.md      slim Beacon skill, always loaded in strict mode (~4 KB)
│   └── beacon-full.md full Beacon reference (33 KB), read on demand
├── test_agent.py      offline tests — no Ollama needed (33 tests)
├── requirements.txt   Python deps (just `requests`)
├── SETUP_GUIDE.md     ordered setup steps for your machine
├── VSCODE_EXTENSION_PLAN.md   Milestone 2 spec (as built)
└── vscode-extension/  Milestone 2: side-panel chat + diff approval
    ├── src/           extension.ts · chatPanel.ts · agentSession.ts · diffProvider.ts
    ├── media/icon.svg  activity-bar icon
    ├── package.json   commands, settings, activation
    └── README.md      build → install → use → troubleshooting
```

## Quick commands (after setup)

```bash
python test_agent.py                 # offline tests
python agent.py --mock --once "hi"   # loop check without Ollama
python agent.py                      # interactive, edits current folder
python agent.py --cwd ~/other/repo   # edit a different project
python agent.py --json --demo        # editor protocol, offline (used by the extension)
```

## Milestone 2 — the VS Code extension

The side-panel chat (chat, diff preview, Approve/Deny, mode switch) lives in
`vscode-extension/`. It is a thin frontend: it spawns
`python agent.py --json` and talks NDJSON over stdin/stdout, so **all** rules
stay in Python. Build it once:

```
cd vscode-extension
npm install
npm run package          # → beacon-agent-0.1.0.vsix (≈20 KB)
```

then VS Code ▸ Extensions ▸ `…` ▸ **Install from VSIX…**.
Full walkthrough: [`vscode-extension/README.md`](vscode-extension/README.md).
