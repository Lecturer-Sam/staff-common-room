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
import re
import sys
from pathlib import Path

from executor import is_safe, run_command
from file_ops import edit_file, read_file, resolve_workspace, write_file
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
- One action per reply. Wait for the result before the next action.
""".strip()


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


def build_system_prompt(skill: str, mode: str) -> str:
    banner = (
        "You are Beacon Agent in STRICT mode. Obey every Ground Rule G1–G14."
        if mode == "beacon"
        else "You are a general coding assistant."
    )
    return f"{banner}\n\n{skill}\n\n{RESPONSE_FORMAT}"


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
        print("🧠 thinking… (first beacon call can take minutes on a small machine)")
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
        if not auto_approve:
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
    return final_text or "Stopped after max steps — say 'continue' to go on."


def main() -> int:
    ap = argparse.ArgumentParser(description="Personal editor agent (standalone)")
    ap.add_argument("--model", default="qwen2.5-coder:14b")
    ap.add_argument("--ollama-url", default="http://localhost:11434")
    ap.add_argument("--timeout", type=int, default=600,
                    help="seconds to wait for Ollama per call (default: 600)")
    ap.add_argument("--num-ctx", type=int, default=12288,
                    help="Ollama context window; must exceed the skill size (default: 12288)")
    ap.add_argument("--mode", choices=["auto", "beacon", "general"], default="auto")
    ap.add_argument("--yes", action="store_true", help="auto-approve actions")
    ap.add_argument("--mock", action="store_true", help="force mock brain (no Ollama)")
    ap.add_argument("--once", default=None, help="run one query then exit")
    ap.add_argument("--cwd", default=".",
                    help="workspace the agent may read/write/run in (default: current dir)")
    args = ap.parse_args()

    workspace = resolve_workspace(args.cwd)
    if not workspace.is_dir():
        print(f"error: workspace does not exist: {workspace}", file=sys.stderr)
        return 1

    client = OllamaClient(base_url=args.ollama_url, model=args.model,
                         timeout=args.timeout, num_ctx=args.num_ctx)
    mode = args.mode
    auto_approve = args.yes

    def resolve_mode(query: str) -> str:
        return detect_mode(query, workspace) if mode == "auto" else mode

    def fresh_history(active_mode: str) -> list[dict]:
        return [{"role": "system",
                 "content": build_system_prompt(load_skill(active_mode), active_mode)}]

    if args.once:
        active = resolve_mode(args.once)
        print(f"mode={active} model={args.model} "
              f"mock={args.mock or not client.is_available()} workspace={workspace}")
        out = handle_turn(args.once, client, active, auto_approve=True,
                          mock=args.mock, workspace=workspace,
                          history=fresh_history(active))
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
