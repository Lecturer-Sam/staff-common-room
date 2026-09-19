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
├── agent.py           the chat → code loop (M1 backend, later the VS Code backend)
├── ollama_client.py   talks to local Ollama (mock fallback when unreachable)
├── executor.py        allowlisted shell execution (safe `run`)
├── file_ops.py        workspace-jailed read/write/edit
├── skills/
│   ├── general.md     general coding skill (default mode)
│   └── beacon.md      copy of Beacon SKILL.md (strict mode for curriculum work)
├── test_agent.py      offline tests — no Ollama needed
├── requirements.txt   Python deps (just `requests`)
└── SETUP_GUIDE.md     ordered setup steps for your machine
```

## Quick commands (after setup)

```bash
python test_agent.py                 # offline tests
python agent.py --mock --once "hi"   # loop check without Ollama
python agent.py                      # interactive, edits current folder
python agent.py --cwd ~/other/repo   # edit a different project
```
