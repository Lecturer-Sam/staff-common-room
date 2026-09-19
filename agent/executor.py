"""Safe shell execution: allowlist + blocklist + confirmation.

Only commands starting with an ALLOWED prefix run. Anything matching a
BLOCKED substring is refused even if the prefix matches.
"""

from __future__ import annotations

import subprocess

# Keep this tight for the prototype. The VS Code extension (phase 2) will
# reuse the same lists so behaviour is identical in the editor.
ALLOWED_PREFIXES = [
    # inspection (always safe)
    "ls", "cat", "head", "tail", "wc", "find", "grep", "rg", "diff",
    "pwd", "echo", "which", "node --version", "yarn --version",
    "python3 --version", "git status", "git diff", "git log",
    # javascript / app
    "yarn dev", "yarn lint", "yarn build", "yarn preview",
    "yarn install", "yarn curriculum",
    # python pipeline / agent
    "python3 ", "python ", "pip install", "pytest",
    "python scripts/", "python tools/",
]

BLOCKED_SUBSTRINGS = [
    "rm -rf", "rm -r /", ":(){", "mkfs", "dd if=", "DROP TABLE",
    "git push --force", "git push -f", "> /dev/", "chmod -R 777 /",
]


def is_safe(command: str) -> tuple[bool, str]:
    cmd = command.strip()
    if not cmd:
        return False, "empty command"
    for bad in BLOCKED_SUBSTRINGS:
        if bad in cmd:
            return False, f"blocked pattern {bad!r}"
    for prefix in ALLOWED_PREFIXES:
        p = prefix.strip()
        if cmd == p or cmd.startswith(p + " ") or cmd.startswith(p):
            # Guard short names: `lssss` must not pass for `ls`.
            if len(p) <= 4 and cmd != p and not cmd.startswith(p + " "):
                continue
            return True, "ok"
    return False, f"not in allowlist (starts with {cmd.split()[0]!r})"


def run_command(command: str, cwd: str, timeout: int = 120) -> tuple[int, str]:
    """Run an allowlisted command, return (returncode, combined_output)."""
    ok, reason = is_safe(command)
    if not ok:
        raise PermissionError(f"Refused to run {command!r}: {reason}")
    proc = subprocess.run(
        command, shell=True, capture_output=True, text=True, cwd=cwd, timeout=timeout
    )
    output = (proc.stdout or "") + (proc.stderr or "")
    return proc.returncode, output[-6000:]  # cap so LLM context never explodes
