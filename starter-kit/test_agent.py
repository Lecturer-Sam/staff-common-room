"""Offline unit tests — no Ollama needed. Run: python test_agent.py"""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import agent as A
from executor import is_safe
from file_ops import edit_file, read_file, safe_path, write_file


class TestParseAction(unittest.TestCase):
    def test_plain_text_is_none(self):
        self.assertIsNone(A.parse_action("Hello, I will read the file first."))

    def test_bare_json(self):
        a = A.parse_action('{"action": "read", "path": "README.md"}')
        self.assertEqual(a, {"action": "read", "path": "README.md"})

    def test_fenced_json(self):
        a = A.parse_action('Here:\n```json\n{"action": "run", "command": "ls"}\n```')
        self.assertEqual(a["action"], "run")

    def test_rejects_unknown_action(self):
        self.assertIsNone(A.parse_action('{"action": "delete_everything"}'))


class TestExecutorAllowlist(unittest.TestCase):
    def test_allows_inspection(self):
        self.assertTrue(is_safe("ls -la")[0])

    def test_allows_yarn_lint(self):
        self.assertTrue(is_safe("yarn lint")[0])

    def test_blocks_rm_rf(self):
        ok, reason = is_safe("rm -rf /tmp/x")
        self.assertFalse(ok)
        self.assertIn("blocked", reason)

    def test_blocks_non_allowlisted(self):
        self.assertFalse(is_safe("npm install")[0])

    def test_rejects_prefix_trick(self):
        self.assertFalse(is_safe("lssss")[0])


class TestFileOps(unittest.TestCase):
    def test_escape_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(PermissionError):
                safe_path("../../etc/passwd", Path(tmp))

    def test_write_read_edit_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_file("sub/a.txt", "hello world", root)
            self.assertEqual(read_file("sub/a.txt", root), "hello world")
            edit_file("sub/a.txt", "world", "agent", root)
            self.assertEqual(read_file("sub/a.txt", root), "hello agent")


class TestSkills(unittest.TestCase):
    def test_both_skills_load(self):
        self.assertIn("Ground", A.load_skill("beacon"))
        self.assertIn("Response format", A.load_skill("general"))

    def test_detect_mode(self):
        with tempfile.TemporaryDirectory() as tmp:
            ws = Path(tmp)
            self.assertEqual(A.detect_mode("fix the nacca curriculum", ws), "beacon")
            self.assertEqual(A.detect_mode("hello", ws), "general")
            # A workspace containing the Beacon repo auto-selects beacon mode
            (ws / "data" / "side").mkdir(parents=True)
            (ws / "data" / "side" / "SKILL.md").write_text("x")
            self.assertEqual(A.detect_mode("hello", ws), "beacon")


class FakeFailingClient:
    """Simulates Ollama timing out — the loop must survive it."""

    def is_available(self):
        return True

    def chat(self, messages):
        raise RuntimeError("simulated ReadTimeout")


class TestRobustness(unittest.TestCase):
    def test_chat_failure_does_not_crash(self):
        with tempfile.TemporaryDirectory() as tmp:
            history = [{"role": "system", "content": "x"}]
            out = A.handle_turn("hi", FakeFailingClient(), "general",
                                True, False, Path(tmp), history)
            self.assertIn("failed", out.lower())
            # history must stay clean (no error stored as assistant reply)
            self.assertEqual(history[-1]["role"], "user")


class FakeActingClient:
    """Simulates a model that always acts and never answers."""

    def is_available(self):
        return True

    def chat(self, messages):
        return '{"action": "read", "path": "nope.txt"}'


class TestMaxSteps(unittest.TestCase):
    def test_stop_message_not_raw_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            history = [{"role": "system", "content": "x"}]
            out = A.handle_turn("hi", FakeActingClient(), "general",
                                True, False, Path(tmp), history, max_steps=2)
            self.assertIn("stopped after 2 steps", out.lower())


class TestEnvironmentPrompt(unittest.TestCase):
    def test_env_block_present(self):
        import platform
        prompt = A.build_system_prompt("skill-text", "general")
        self.assertIn("## Environment", prompt)
        self.assertIn(platform.system(), prompt)

    def test_windows_block_content(self):
        import platform
        real = platform.system
        platform.system = lambda: "Windows"
        try:
            block = A.environment_block()
        finally:
            platform.system = real
        self.assertIn("BACKSLASHES", block)
        self.assertIn("DO NOT EXIST", block)


class TestAnswerFirst(unittest.TestCase):
    def test_harness_prefers_answering_from_context(self):
        prompt = A.build_system_prompt("skill-text", "general")
        self.assertIn("already in the skill", prompt)

    def test_beacon_skill_has_golden_examples(self):
        skill = A.load_skill("beacon")
        self.assertIn("Golden examples", skill)
        self.assertIn("L1: 3,095", skill)


class TestApprovalPolicy(unittest.TestCase):
    def test_run_always_asks_when_human_present(self):
        self.assertTrue(A.needs_approval({"action": "run"}, True))

    def test_write_auto_approves_when_told(self):
        self.assertFalse(A.needs_approval({"action": "write"}, True))

    def test_write_asks_by_default(self):
        self.assertTrue(A.needs_approval({"action": "write"}, False))

    def test_read_never_asks(self):
        self.assertFalse(A.needs_approval({"action": "read"}, False))

    def test_non_interactive_never_prompts(self):
        # --once / scripted runs have no stdin to answer a prompt.
        self.assertFalse(A.needs_approval({"action": "write"}, False, interactive=False))


class TestPreviewAction(unittest.TestCase):
    def test_new_file_is_all_added(self):
        with tempfile.TemporaryDirectory() as tmp:
            ev = A.preview_action(
                {"action": "write", "path": "new.py", "content": "print(1)\n"}, Path(tmp))
            self.assertEqual((ev["added"], ev["removed"]), (1, 0))
            self.assertIn("+++", ev["diff"])
            self.assertFalse(ev["exists"])

    def test_edit_preview_counts_change(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "a.py").write_text("one\ntwo\n", encoding="utf-8")
            ev = A.preview_action(
                {"action": "edit", "path": "a.py", "old_text": "two", "new_text": "three"}, root)
            self.assertEqual((ev["added"], ev["removed"]), (1, 1))
            self.assertIn("+three", ev["diff"])
            self.assertNotIn("+two", ev["diff"])

    def test_missing_old_text_reported_not_raised(self):
        with tempfile.TemporaryDirectory() as tmp:
            ev = A.preview_action(
                {"action": "edit", "path": "a.py", "old_text": "zzz", "new_text": "y"}, Path(tmp))
            self.assertIn("old_text not found", ev["error"])

    def test_escape_attempt_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            ev = A.preview_action(
                {"action": "write", "path": "../evil.py", "content": "x"}, Path(tmp))
            self.assertIn("error", ev)


class ScriptedClient:
    """First reply acts, later replies talk — enough to drive a whole session."""

    def __init__(self, first: str, later: str = "All done."):
        self.first = first
        self.later = later
        self.calls = 0

    def is_available(self):
        return True

    def chat(self, messages):
        self.calls += 1
        return self.first if self.calls == 1 else self.later


def run_json_session(lines, tmp, client, **overrides):
    """Drive json_session with fake stdin/stdout; returns (events, SystemExit code)."""
    import argparse
    import contextlib
    import io
    import json as _json

    args = argparse.Namespace(model="m", mode="general", yes=False, mock=False,
                              demo=False, max_steps=3)
    for k, v in overrides.items():
        setattr(args, k, v)
    old_in, old_out = sys.stdin, sys.stdout
    buf = io.StringIO()
    code = None
    sys.stdin = io.StringIO("".join(line + "\n" for line in lines))
    sys.stdout = buf
    try:
        with contextlib.redirect_stderr(io.StringIO()):
            A.json_session(args, Path(tmp), client)
    except SystemExit as e:  # EOF on stdin is the normal way a session ends
        code = e.code
    finally:
        sys.stdin, sys.stdout = old_in, old_out
    return [_json.loads(l) for l in buf.getvalue().splitlines() if l.strip()], code


class TestJsonSession(unittest.TestCase):
    def test_single_task_emits_ready_action_result_done(self):
        with tempfile.TemporaryDirectory() as tmp:
            client = ScriptedClient('{"action": "write", "path": "x.txt", "content": "hi"}')
            events = run_json_session(['{"task": "write x"}'], tmp, client, yes=True)[0]
            kinds = [e["type"] for e in events]
            self.assertEqual(kinds[0], "ready")
            action = next(e for e in events if e["type"] == "action")
            self.assertEqual(action["path"], "x.txt")
            self.assertFalse(action["need_approval"])          # --yes applies writes
            self.assertTrue((Path(tmp) / "x.txt").is_file())
            self.assertEqual(kinds[-1], "done")
            self.assertEqual(events[-2]["type"], "message")

    def test_denied_write_never_touches_disk(self):
        with tempfile.TemporaryDirectory() as tmp:
            client = ScriptedClient('{"action": "write", "path": "x.txt", "content": "hi"}')
            events = run_json_session(
                ['{"task": "write x"}', '{"decision": "deny"}'], tmp, client)[0]
            action = next(e for e in events if e["type"] == "action")
            self.assertTrue(action["need_approval"])
            result = next(e for e in events if e["type"] == "result")
            self.assertFalse(result["ok"])
            self.assertFalse((Path(tmp) / "x.txt").exists())

    def test_second_task_reuses_the_same_session(self):
        with tempfile.TemporaryDirectory() as tmp:
            client = ScriptedClient('{"action": "write", "path": "x.txt", "content": "hi"}')
            events = run_json_session(
                ['{"task": "write x"}', '{"task": "anything else"}'], tmp, client, yes=True)[0]
            self.assertEqual([e["type"] for e in events].count("done"), 2)
            self.assertEqual([e["type"] for e in events].count("ready"), 1)  # one process
            self.assertEqual(client.calls, 3)  # action, summary, then task 2

    def test_reset_and_set_mode(self):
        with tempfile.TemporaryDirectory() as tmp:
            events = run_json_session(
                ['{"type": "set_mode", "mode": "beacon"}', '{"type": "reset"}'],
                tmp, ScriptedClient("hi"))[0]
            self.assertIn({"type": "mode", "mode": "beacon"}, events)
            self.assertTrue(any(e["type"] == "reset" for e in events))

    def test_bad_input_line_is_ignored_not_fatal(self):
        with tempfile.TemporaryDirectory() as tmp:
            client = ScriptedClient('{"action": "write", "path": "x.txt", "content": "hi"}')
            events = run_json_session(
                ['oops not json', '{"task": "write x"}'], tmp, client, yes=True)[0]
            self.assertTrue(any(e["type"] == "error" for e in events))
            self.assertTrue(any(e["type"] == "action" for e in events))


if __name__ == "__main__":
    unittest.main()
