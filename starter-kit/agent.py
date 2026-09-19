#!/usr/bin/env python3
"""Personal editor agent — standalone prototype (chat → code loop).

This project is INDEPENDENT of staff-common-room. It only borrows a copy
of the Beacon skill (skills/beacon.md). Point it at any codebase with --cwd.

Usage (from this folder):
    pip install -r requirements.txt
    ollama serve & ollama pull qwen2.5-coder:14b   # one-time, on your machine
    python agent.py                                # interactive, edits current dir
    python agent.py --cwd ~/path/to/some/project  # edit a different project
    python agent.py --once "list the workspace"    # one-shot (for scripts / VS Code)
    python agent.py --mock --once "hello"          # no Ollama needed
    python agent.py --json                         # editor protocol (VS Code extension)

In --json mode the agent speaks newline-delimited JSON on stdout and reads
the task + approve/deny decisions as JSON lines on stdin. Used by
vscode-extension/; see json_session() for the wire format.

Inside the loop:
    /beacon | /general   switch skill mode
    /mode                show current mode
    /yes                 toggle auto-approve (default: ask every time)
    /help                this help
    /exit                quit
"""

from __future__ import annotations

import argparse
import json
import platform
import re
import sys
from pathlib import Path

from executor import is_safe, run_command
from file_ops import edit_file, read_file, resolve_workspace, safe_path, write_file
from ollama_client import OllamaClient, mock_reply

PROJECT_DIR = Path(__file__).resolve().parent
SKILLS_DIR = PROJECT_DIR / "skills"
BEACON_SKILL = SKILLS_DIR / "beacon.md"
GENERAL_SKILL = SKILLS_DIR / "general.md"

BEACON_TRIGGERS = (
    "beacon", "nacca", "curriculum", "firestore", "lesson plan",
    "question bank", "exam", "staff-common-room",
)

RESPONSE_FORMAT = """
## Response format (harness contract — follow exactly)
- To act, reply with EXACTLY one JSON object and nothing else:
  {"action": "read", "path": "relative/path"}
  {"action": "write", "path": "relative/path", "content": "full content"}
  {"action": "edit", "path": "relative/path", "old_text": "...", "new_text": "..."}
  {"action": "run", "command": "shell command"}
- Otherwise reply in plain text.
- If the answer is already in the skill or conversation above, reply in plain text
  immediately — do not emit actions to "look it up" or "verify" it.
- One action per reply. Wait for the result before the next action.
""".strip()


def environment_block() -> str:
    """OS facts the model must not guess (small models default to Unix)."""
    if platform.system() == "Windows":
        return (
            "## Environment (facts — do not guess otherwise)\n"
            "- OS: Windows. Shell: cmd/PowerShell.\n"
            "- List files with `dir`, print files with `type`, locate programs with `where`.\n"
            "- `cat`, `ls`, `grep`, `find` DO NOT EXIST here — never propose them.\n"
            "- Paths use BACKSLASHES: `dir data\\curriculum`. Forward slashes break `dir`/`type`."
        )
    return (
        "## Environment (facts — do not guess otherwise)\n"
        f"- OS: {platform.system()}. Shell: sh/bash.\n"
        "- List files with `ls`, print files with `cat`, search with `grep`.\n"
        "- Paths use forward slashes."
    )


def load_skill(mode: str) -> str:
    path = BEACON_SKILL if mode == "beacon" else GENERAL_SKILL
    if not path.is_file():
        raise FileNotFoundError(f"Skill file missing: {path}")
    return path.read_text(encoding="utf-8", errors="replace")


def detect_mode(query: str, workspace: Path) -> str:
    """Beacon mode when the task names it, or the workspace IS a Beacon repo."""
    if any(t in query.lower() for t in BEACON_TRIGGERS):
        return "beacon"
    if (workspace / "data" / "side" / "SKILL.md").exists():
        return "beacon"
    return "general"


class DemoClient:
    """Offline stand-in for Ollama: proposes one file write, then summarises.

    Used by `--demo` so the editor UI (diff preview + approve/deny) can be
    verified end-to-end without a model or network. It never touches Ollama.
    """

    is_mock = True

    def is_available(self) -> bool:
        return True

    def chat(self, messages: list[dict], model: str | None = None) -> str:
        acted = any(m.get("role") == "assistant" for m in messages)
        if not acted:
            return json.dumps({
                "action": "write",
                "path": "agent_demo.py",
                "content": (
                    '"""Created by the personal editor agent (offline demo)."""\n\n\n'
                    "def greet(name: str = \"world\") -> str:\n"
                    "    return f\"Hello, {name}!\"\n\n\n"
                    "if __name__ == \"__main__\":\n"
                    "    print(greet())\n"
                ),
            })
        note = [m for m in messages if m.get("role") == "user"
                and str(m.get("content", "")).startswith("Tool result:")]
        return ("Demo complete — I proposed a new file `agent_demo.py`.\n\n"
                "If you approved it, it now exists in your workspace; open it and "
                "try Run. This offline path proves the panel wiring (diff preview → "
                "approve → result) without needing Ollama.\n\n"
                + (f"Last tool result: {note[-1]['content'][:200]}" if note else ""))


def build_system_prompt(skill: str, mode: str) -> str:
    banner = (
        "You are Beacon Agent in STRICT mode. Obey every Ground Rule G1–G14."
        if mode == "beacon"
        else "You are a general coding assistant."
    )
    return f"{banner}\n\n{skill}\n\n{environment_block()}\n\n{RESPONSE_FORMAT}"


def parse_action(reply: str) -> dict | None:
    """Extract a single JSON action from an LLM reply, or None for chat."""
    text = reply.strip()
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = m.group(1) if m else text
    if not m:
        m2 = re.search(r"\{.*\}", text, re.DOTALL)
        if not m2:
            return None
        candidate = m2.group(0)
    try:
        obj = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    if isinstance(obj, dict) and obj.get("action") in ("read", "write", "edit", "run"):
        return obj
    return None


def needs_approval(action: dict, auto_approve: bool, interactive: bool = True) -> bool:
    """Approval policy, shared by the terminal loop and the editor session.

    - reads never ask;
    - writes/edits apply silently only when auto-approve is on;
    - shell commands ALWAYS ask when a human is present, even with --yes;
    - non-interactive runs (--once, scripts) never prompt, they would crash.
    """
    if action["action"] == "read":
        return False
    if not interactive:
        return False
    return action["action"] == "run" or not auto_approve


def describe_action(action: dict) -> str:
    a = action["action"]
    if a == "run":
        return f"run: {action.get('command', '')}"
    if a == "read":
        return f"read: {action.get('path', '')}"
    if a == "write":
        return f"write: {action.get('path', '')} ({len(action.get('content', ''))} chars)"
    if a == "edit":
        return f"edit: {action.get('path', '')}"
    return json.dumps(action)


# --------------------------------------------------------------------------
# JSON session protocol (used by the VS Code extension AND the terminal)
# --------------------------------------------------------------------------
# stdout: one JSON object per line (NDJSON), e.g.
#   {"type":"ready","model":"...","workspace":"...","mode":"general"}
#   {"type":"message","text":"..."}            assistant reply (final answer)
#   {"type":"diff","path":"a.py","old":"...","new":"...","added":3,"removed":1}
#   {"type":"result","text":"...","ok":true}   tool output after approval
#   {"type":"error","message":"..."}
# stdin: {"task":"..."} plus {"decision":"approve"|"deny"} per proposed action.
# A "diff" event with "need_approval": true is the editor's pause point: the
# frontend shows it, the user clicks approve/deny, and the answer is written
# back on stdin. Denial is instant and needs no extra model round-trip.


def unified_diff(old: str, new: str, path: str, context: int = 3) -> str:
    """Unified diff of old vs new file content, for the editor preview."""
    import difflib

    label = path.replace("\\", "/")
    lines = difflib.unified_diff(
        old.splitlines(keepends=True), new.splitlines(keepends=True),
        fromfile=f"a/{label}", tofile=f"b/{label}", n=context,
    )
    return "".join(lines)


def _count_diff(old: str, new: str) -> tuple[int, int]:
    import difflib

    added = removed = 0
    for line in difflib.unified_diff(old.splitlines(), new.splitlines(), n=0):
        if line.startswith("+++") or line.startswith("---"):
            continue
        if line.startswith("+"):
            added += 1
        elif line.startswith("-"):
            removed += 1
    return added, removed


def preview_action(action: dict, workspace: Path) -> dict:
    """Describe a proposed action for humans, including a diff when a file
    actually changes. Never raises: a broken proposal still gets reported."""
    a = action["action"]
    rel = str(action.get("path", ""))
    event = {
        "action": a, "summary": describe_action(action),
        "path": rel, "need_approval": not action.get("_auto"),
    }
    if a in ("read", "run"):
        return event
    try:
        target = safe_path(rel, workspace)
        old = target.read_text(encoding="utf-8", errors="replace") if target.is_file() else ""
        if a == "write":
            new = action.get("content", "")
            if not isinstance(new, str):
                new = json.dumps(new, indent=2)
        else:  # edit
            old_text = action.get("old_text", "")
            new_text = action.get("new_text", "")
            if not isinstance(old_text, str) or not isinstance(new_text, str):
                old_text, new_text = str(old_text), str(new_text)
            if old_text not in old:
                event["error"] = "old_text not found (exact match required)"
                new = old
            else:
                new = old.replace(old_text, new_text, 1)
        added, removed = _count_diff(old, new)
        event.update({"old": old, "new": new,
                      "diff": unified_diff(old, new, rel),
                      "added": added, "removed": removed,
                      "exists": bool(old)})
    except Exception as e:
        event["error"] = f"{type(e).__name__}: {e}"
    return event


def run_task(args, workspace: Path, client, query: str, history: list[dict],
             active_mode: str, emit, read_message) -> str:
    """Run ONE task through act → observe cycles; returns the text to show.

    `history` is mutated so the next task in the same session keeps context.
    """
    if args.mock or not client.is_available():
        # --demo deliberately falls through: DemoClient is a scripted *brain*,
        # so the normal action → diff → approve path still runs.
        return mock_reply(query, active_mode)

    auto_approve = args.yes
    final_text = ""
    for _ in range(args.max_steps):
        history.append({"role": "user", "content": query})
        emit({"type": "thinking"})
        try:
            reply = client.chat(history)
        except Exception as e:
            history.pop()  # keep the history well-formed for the next try
            return (
                f"Ollama request failed ({type(e).__name__}: {e}). The model may still be "
                "loading a big skill — wait a moment and ask again, or restart VS Code with "
                "a bigger timeout setting (Beacon Agent ▸ Timeout)."
            )
        history.append({"role": "assistant", "content": reply})
        action = parse_action(reply)
        if action is None:
            return reply  # plain chat — task ends here

        if action["action"] == "run":
            ok, reason = is_safe(action.get("command", ""))
            if not ok:
                obs = f"BLOCKED by allowlist: {reason}"
                emit({"type": "result", "ok": False, "text": obs})
                history.append({"role": "user", "content": f"Tool result:\n{obs}"})
                query = "That action was blocked. Propose a safe alternative, or answer in plain text."
                continue

        event = preview_action(action, workspace)
        event["need_approval"] = needs_approval(action, auto_approve)
        emit({"type": "action", **event})

        if event["need_approval"]:
            decision = "deny"
            while True:
                msg = read_message()
                if msg is None:
                    continue
                if msg.get("type") == "cancel":
                    return "Cancelled."
                if "decision" in msg:
                    decision = "approve" if str(msg["decision"]).startswith("appr") else "deny"
                    break
            if decision != "approve":
                obs = "User rejected the action. Ask what to do instead, or answer in plain text."
                emit({"type": "result", "ok": False, "text": "rejected by user"})
                history.append({"role": "user", "content": f"Tool result:\n{obs}"})
                query = "Continue: propose a different next step, or answer in plain text."
                continue

        try:
            result = execute_action(action, workspace)
        except Exception as e:  # never let a tool crash the session
            result = f"Tool error: {type(e).__name__}: {e}"
        emit({"type": "result", "ok": not result.startswith("Tool error"),
              "text": result[:4000]})
        history.append({"role": "user", "content": f"Tool result:\n{result}"})
        query = "Continue with the next step, or summarise if done."
        final_text = result

    last = final_text or "(no tool ran)"
    return (f"I stopped after {args.max_steps} steps without reaching a final answer — "
            "say 'continue' to go on, or rephrase the task.\n"
            f"Last tool result:\n{last}")


def json_session(args, workspace: Path, client) -> int:
    """Machine-driven loop for editor frontends (VS Code extension).

    One process serves a whole chat: after each task it emits {"type":"done"}
    and waits for the next {"task": ...}, keeping conversation history alive.
    Also accepts {"type":"reset"} and {"type":"set_mode","mode":...}.
    """
    def emit(obj: dict) -> None:
        sys.stdout.write(json.dumps(obj) + "\n")
        sys.stdout.flush()

    def read_line() -> str | None:
        line = sys.stdin.readline()
        if line == "":  # editor closed the pipe
            raise SystemExit(0)
        return line

    def read_message() -> dict | None:
        while True:
            line = read_line()
            if line is None or not line.strip():
                return None
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                emit({"type": "error",
                      "message": f"ignored non-JSON input line: {line.strip()[:120]}"})

    print("editor session started — waiting for tasks on stdin", file=sys.stderr)
    mode = args.mode
    active_mode = detect_mode("", workspace) if mode == "auto" else mode
    history = [{"role": "system",
                "content": build_system_prompt(load_skill(active_mode), active_mode)}]
    emit({"type": "ready", "model": args.model, "workspace": str(workspace),
          "mode": active_mode, "auto_approve": args.yes,
          "mock": args.demo or args.mock or not client.is_available()})

    while True:
        msg = read_message()
        if msg is None:
            continue
        kind = msg.get("type")
        if kind == "reset":
            del history[1:]  # keep the system prompt, forget the conversation
            emit({"type": "reset"})
            continue
        if kind == "set_mode":
            wanted = str(msg.get("mode", ""))
            if wanted not in ("auto", "beacon", "general"):
                emit({"type": "error", "message": f"unknown mode {wanted!r}"})
                continue
            mode = wanted
            active_mode = detect_mode("", workspace) if mode == "auto" else mode
            history = [{"role": "system",
                        "content": build_system_prompt(load_skill(active_mode), active_mode)}]
            emit({"type": "mode", "mode": active_mode})
            continue

        query = str(msg.get("task", "")).strip()
        if not query:
            emit({"type": "error", "message": 'send {"task": "..."} or {"type": "reset"}'})
            continue

        # auto mode: a Beacon-flavoured task switches skill AND resets history
        if mode == "auto":
            detected = detect_mode(query, workspace)
            if detected != active_mode:
                active_mode = detected
                history = [{"role": "system",
                            "content": build_system_prompt(load_skill(active_mode), active_mode)}]
                emit({"type": "mode", "mode": active_mode})

        text = run_task(args, workspace, client, query, history, active_mode, emit, read_message)
        emit({"type": "message", "text": text})
        emit({"type": "done"})
    # unreachable: read_line() exits on EOF



def execute_action(action: dict, workspace: Path) -> str:
    a = action["action"]
    if a == "read":
        return read_file(action["path"], workspace)
    if a == "write":
        return write_file(action["path"], action.get("content", ""), workspace)
    if a == "edit":
        return edit_file(action["path"], action["old_text"], action["new_text"], workspace)
    if a == "run":
        code, out = run_command(action["command"], cwd=str(workspace))
        return f"[exit {code}]\n{out}"
    raise ValueError(f"unknown action {a!r}")


HELP = """Commands:
  /beacon | /general   switch skill mode      /mode   show mode
  /yes                 toggle auto-approve    /help   this help
  /exit                quit
Just type a task (e.g. "read README.md and summarise the layout")."""


def handle_turn(query: str, client: OllamaClient, mode: str,
                auto_approve: bool, mock: bool, workspace: Path,
                history: list[dict], max_steps: int = 6) -> str:
    """Run one user query through act → observe cycles. Returns final text."""
    history.append({"role": "user", "content": query})
    final_text = ""
    for _ in range(max_steps):
        if mock or not client.is_available():
            reply = mock_reply(query, mode) if len(history) <= 2 else (
                "[mock brain] Ollama is unreachable, so I stop after one safe step. "
                "Start Ollama for live multi-step runs.")
            history.append({"role": "assistant", "content": reply})
            return reply
        print("🧠 thinking…")
        try:
            reply = client.chat(history)
        except Exception as e:
            # Never crash the loop on an LLM failure — report and stay alive.
            return (
                f"Ollama request failed ({type(e).__name__}: {e}).\n"
                "The model may still be chewing through a big skill — wait a bit "
                "and ask again. Tips: pre-warm with `ollama run <model> hi`, "
                "or restart the agent with a bigger --timeout (e.g. --timeout 900)."
            )
        history.append({"role": "assistant", "content": reply})
        action = parse_action(reply)
        if action is None:
            return reply  # plain chat — turn ends
        desc = describe_action(action)
        print(f"\n⚡ proposed action → {desc}")
        if action["action"] == "run":
            ok, reason = is_safe(action.get("command", ""))
            if not ok:
                obs = f"BLOCKED by allowlist: {reason}"
                print(f"🚫 {obs}")
                history.append({"role": "user", "content": f"Tool result:\n{obs}"})
                continue
        if needs_approval(action, auto_approve, sys.stdin.isatty()):
            confirm = input("Approve? [y/N]: ").strip().lower()
            if confirm != "y":
                obs = "User rejected the action. Ask what to do instead."
                history.append({"role": "user", "content": f"Tool result:\n{obs}"})
                final_text = "Action rejected — tell me what to do instead."
                continue
        try:
            result = execute_action(action, workspace)
        except Exception as e:  # never let a tool crash the loop
            result = f"Tool error: {type(e).__name__}: {e}"
        print(f"✅ result:\n{result[:1500]}")
        history.append({"role": "user", "content": f"Tool result:\n{result}"})
        query = "Continue with the next step, or summarise if done."
        final_text = result
    last = final_text or "(no tool ran)"
    return (f"I stopped after {max_steps} steps without reaching a final answer — "
            "say 'continue' to go on, or rephrase the task.\n"
            f"Last tool result:\n{last}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Personal editor agent (standalone)")
    ap.add_argument("--model", default="qwen2.5-coder:14b")
    ap.add_argument("--ollama-url", default="http://localhost:11434")
    ap.add_argument("--timeout", type=int, default=600,
                    help="seconds to wait for Ollama per call (default: 600)")
    ap.add_argument("--num-ctx", type=int, default=12288,
                    help="Ollama context window; must exceed the skill size (default: 12288)")
    ap.add_argument("--mode", choices=["auto", "beacon", "general"], default="auto")
    ap.add_argument("--yes", action="store_true",
                    help="auto-approve file writes/edits (shell commands still ask)")
    ap.add_argument("--mock", action="store_true", help="force mock brain (no Ollama)")
    ap.add_argument("--once", default=None, help="run one query then exit")
    ap.add_argument("--json", action="store_true",
                    help="editor protocol: NDJSON on stdout, tasks on stdin (VS Code extension)")
    ap.add_argument("--demo", action="store_true",
                    help="offline scripted demo (one write action) — proves the editor UI wiring")
    ap.add_argument("--max-steps", type=int, default=6,
                    help="max act→observe cycles per task (default: 6)")
    ap.add_argument("--cwd", default=".",
                    help="workspace the agent may read/write/run in (default: current dir)")
    args = ap.parse_args()

    workspace = resolve_workspace(args.cwd)
    if not workspace.is_dir():
        print(f"error: workspace does not exist: {workspace}", file=sys.stderr)
        return 1

    client = OllamaClient(base_url=args.ollama_url, model=args.model,
                         timeout=args.timeout, num_ctx=args.num_ctx)
    if args.demo:
        client = DemoClient()
    mode = args.mode
    auto_approve = args.yes

    def resolve_mode(query: str) -> str:
        return detect_mode(query, workspace) if mode == "auto" else mode

    def fresh_history(active_mode: str) -> list[dict]:
        return [{"role": "system",
                 "content": build_system_prompt(load_skill(active_mode), active_mode)}]

    if args.json:
        return json_session(args, workspace, client)

    if args.once:
        active = resolve_mode(args.once)
        print(f"mode={active} model={args.model} "
              f"mock={args.mock or not client.is_available()} workspace={workspace}")
        out = handle_turn(args.once, client, active, auto_approve=True,
                          mock=args.mock, workspace=workspace,
                          history=fresh_history(active), max_steps=args.max_steps)
        print(f"\n🤖 Agent:\n{out}")
        return 0

    print("🔶 Personal editor agent (standalone)")
    print(f"   brain={'mock' if args.mock else args.model + ' @ ' + args.ollama_url}")
    print(f"   workspace={workspace}")
    print("   Type /help for commands.\n")

    active_mode = resolve_mode("")
    history = fresh_history(active_mode)

    while True:
        try:
            query = input("🔶 You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nbye.")
            return 0
        if not query:
            continue
        if query in ("/exit", "exit", "quit"):
            print("bye.")
            return 0
        if query == "/help":
            print(HELP)
            continue
        if query == "/mode":
            print(f"mode={active_mode} auto_approve={auto_approve}")
            continue
        if query == "/yes":
            auto_approve = not auto_approve
            print(f"auto_approve={auto_approve}")
            continue
        if query in ("/beacon", "/general"):
            active_mode = query[1:]
            mode = active_mode
            history = fresh_history(active_mode)
            print(f"switched to {active_mode} mode")
            continue
        if mode == "auto":
            new_mode = detect_mode(query, workspace)
            if new_mode != active_mode:
                active_mode = new_mode
                history = fresh_history(active_mode)
                print(f"(auto-switched to {active_mode} mode)")
        out = handle_turn(query, client, active_mode, auto_approve,
                          mock=args.mock, workspace=workspace, history=history)
        print(f"\n🤖 Agent: {out}\n")


if __name__ == "__main__":
    sys.exit(main())
