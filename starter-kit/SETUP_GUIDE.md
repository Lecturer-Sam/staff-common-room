# Setup Guide — AI Agent + SKILL + Ollama (in order)

Do these steps **top to bottom, on your own computer**. Each step has a
✅ check so you know it worked before moving on. Nothing here touches
`staff-common-room` — that repo stays as it is.

> Where commands differ, **Windows (PowerShell)** is shown first, then
> **macOS / Linux (bash)**.

---

## Step 0 — Understand the pieces (2 min, read-only)

You are assembling 4 things that must find each other:

```
┌──────────────────┐   localhost:11434   ┌──────────────────┐
│  my-editor-agent │ ───── HTTP ────────▶ │  Ollama (brain)  │
│  folder          │                     │  qwen2.5-coder   │
│  ┌────────────┐  │                     └──────────────────┘
│  │ skills/    │  │   --cwd Workspace    ┌──────────────────┐
│  │  general.md│  │ ──── edits ────────▶ │ your code project│
│  │  beacon.md │  │   (jailed reads /    │ (any folder)     │
│  └────────────┘  │    writes / runs)    └──────────────────┘
│  agent.py + venv │
└──────────────────┘
```

- **Folder** — this project. It must sit in its own directory (NOT inside
  `staff-common-room`), because the agent jails all file edits to a workspace.
- **SKILLs** — markdown rulebooks in `skills/`. `general.md` for everyday
  coding, `beacon.md` (copied from `staff-common-room/data/side/SKILL.md`)
  for strict curriculum work.
- **Brain** — Ollama running locally with a coder model.
- **Workspace** — whichever project folder you point `--cwd` at.

---

## Step 1 — Install Python 3.10+ (5 min)

The agent is Python. (Ollama you already have — we verify it in Step 4.)

**Windows:** install from `python.org` → during install tick
**“Add python.exe to PATH”**.

**macOS:** `brew install python3` (or python.org installer).
**Linux:** `sudo apt install python3 python3-venv` (Debian/Ubuntu).

✅ Check — same on all systems:

```bash
python --version    # Windows
python3 --version   # macOS / Linux
```

You need `3.10` or higher.

---

## Step 2 — Create the project folder (2 min)

Pick a home **outside** `staff-common-room`. Suggested:

| System | Path |
|---|---|
| Windows | `C:\projects\my-editor-agent` |
| macOS / Linux | `~/projects/my-editor-agent` |

```powershell
# Windows (PowerShell)
mkdir C:\projects\my-editor-agent
```

```bash
# macOS / Linux
mkdir -p ~/projects/my-editor-agent
```

Copy **all files from this starter kit** into that folder, so it looks like:

```
my-editor-agent/
├── agent.py  executor.py  file_ops.py  ollama_client.py
├── requirements.txt  test_agent.py  README.md  SETUP_GUIDE.md
└── skills/
    ├── general.md
    └── beacon.md
```

✅ Check: `skills/beacon.md` and `skills/general.md` both exist.

> Why a separate folder? Two reasons: (1) the agent jails every file
> write to its workspace — nesting it inside another project blurs what it
> may touch; (2) this will become its own git repo (Step 7), and nested git
> repos cause constant pain.

---

## Step 3 — Python virtual environment + deps (5 min)

```powershell
# Windows (PowerShell) — run inside my-editor-agent
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

```bash
# macOS / Linux — run inside my-editor-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

✅ Check:

```bash
python test_agent.py
```

You want `Ran 13 tests … OK`. These tests are **offline** — they prove the
skill loader, the JSON-action parser, the command allowlist, and the
workspace jail all work before any AI is involved.

> If `Activate.ps1` is blocked on Windows, run PowerShell as Administrator
> once: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

## Step 4 — Verify Ollama + pull the model (10–30 min, one-time download)

You already installed Ollama — now confirm the server runs and fetch the brain.

```bash
ollama --version        # any recent version is fine
ollama serve            # start the server (skip if Ollama already runs as a service —
                        # on Windows/macOS it usually auto-starts; Linux usually needs this)
```

In a **second terminal**:

```bash
ollama pull qwen2.5-coder:14b   # ~9 GB download, wants ~16 GB RAM
ollama list                     # the model must appear here
```

**Smaller machine?** Use the 7B model instead (~4.7 GB, runs on ~8 GB RAM).
Everything else stays identical — just pass `--model qwen2.5-coder:7b`:

```bash
ollama pull qwen2.5-coder:7b
```

✅ Check — the API the agent actually calls:

```bash
curl http://localhost:11434/api/tags
```

You must get a JSON reply listing your model. If `curl` fails, the agent
will too — fix Ollama before continuing (usually: start `ollama serve`,
or allow `localhost:11434` through the firewall).

---

## Step 5 — Mock run (no AI, 2 min)

Proves the loop works end to end without needing the model:

```bash
python agent.py --mock --once "list the workspace"
```

✅ Check: you get a `[mock brain …]` reply and `mode=general` (or `beacon`
if you run it inside a Beacon repo). No crash = the harness is healthy.

---

## Step 6 — First LIVE run (5 min)

⚠️ Stay in **approve mode** (the default): the agent must ask before every
file write or shell command. Never start with `--yes`.

```bash
# Terminal 1 (if needed): ollama serve
# Terminal 2:
python agent.py --once "read README.md and summarise this project in 3 bullets"
```

What should happen:

1. The agent proposes `read: README.md` → you press `y`.
2. It reads the file, then answers in plain text with 3 bullets.

✅ Check: you saw `⚡ proposed action → read: …`, approved it, and got a
sensible summary. **The Agent + SKILL + Ollama chain is now live.**

Then try the interactive loop and the modes:

```bash
python agent.py
```

- Type `/mode` → see the current mode.
- Type `/beacon` → strict Beacon rules (try: “how many indicators are
  there?” — it must name the L1/L2/L3 layer per rule G9).
- Type `/general` → normal coding (try: “create hello.py that prints hi”
  → approve the `write` → approve the `run`).

---

## Step 7 — Make it yours: git + skill tuning (10 min)

```bash
cd my-editor-agent
git init
git add .
git commit -m "chore: standalone editor agent baseline"
```

Now the workflow that replaces “training” (per your `TRAINING A SKILL.md`:
**RAG + prompt first, fine-tune only if the model keeps breaking rules**):

1. **Edit `skills/general.md`** to match how YOU want code written
   (style, test commands, things it must never do).
2. **Re-run** `python agent.py` — the skill reloads every launch, so
   iterating takes seconds, not GPU-hours.
3. If you outgrow one skill, add more files under `skills/` (e.g.
   `skills/flask.md`) and teach `agent.py` a `/flask` switch later.
4. If `skills/beacon.md` drifts from the original, refresh it:
   copy `staff-common-room/data/side/SKILL.md` over it again.

✅ Check: change one line in `skills/general.md` (e.g. “always explain in
one paragraph first”), restart the agent, and see the behaviour change.

---

## Step 8 — Point it at real projects (ongoing)

The agent edits **whichever folder you give it**:

```bash
# Edit some other repo (general mode auto-selected)
python agent.py --cwd ~/projects/my-website

# Edit staff-common-room in strict Beacon mode (auto-selected by detection)
python agent.py --cwd ~/projects/staff-common-room
```

Rules of the road:

- `--cwd` is a **jail**: the agent cannot read/write/run outside it.
- Approve every action until you trust the loop; use `--yes` only for
  well-understood batch runs, never blindly.
- Keep Ollama models updated occasionally: `ollama pull qwen2.5-coder:14b`.

---

## What comes AFTER this guide (not now)

| Next milestone | What it adds |
|---|---|
| VS Code extension | Chat panel + diff preview + approve buttons inside the editor, calling `agent.py --once` |
| RAG over curriculum JSONs | A `search` action so Beacon mode can cite the 44 NaCCA JSONs (Approach 1 in `TRAINING A SKILL.md`) |
| Fine-tune (QLoRA) | Only if the model keeps violating skill rules despite them being in the prompt |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `curl localhost:11434` fails | `ollama serve` is not running — start it |
| `ollama pull` is very slow | Normal on first download (~9 GB for 14B); try the 7B model |
| Model answers but never acts | It may be replying in chat instead of JSON — nudge it: “reply with exactly one JSON action” |
| `BLOCKED by allowlist` | The command isn't in `executor.py`'s list — add the prefix deliberately if you trust it |
| On Windows, `ls`/`cat` fail | Use `dir` / `type` instead — both are allowlisted for Windows |
| `escapes the workspace` | You asked for a path outside `--cwd` — move the file or change `--cwd` |
| `python test_agent.py` fails | Re-check Step 3: venv activated? `pip install -r requirements.txt` run? |
