"""Offline unit tests for the prototype loop — no Ollama needed."""

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
        ok, _ = is_safe("ls -la")
        self.assertTrue(ok)

    def test_allows_yarn_lint(self):
        ok, _ = is_safe("yarn lint")
        self.assertTrue(ok)

    def test_blocks_rm_rf(self):
        ok, reason = is_safe("rm -rf /tmp/x")
        self.assertFalse(ok)
        self.assertIn("blocked", reason)

    def test_blocks_non_allowlisted(self):
        ok, _ = is_safe("npm install")
        self.assertFalse(ok)

    def test_rejects_prefix_trick(self):
        ok, _ = is_safe("lssss")
        self.assertFalse(ok)


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
        self.assertEqual(A.detect_mode("fix the nacca curriculum bundle"), "beacon")
        # Inside this repo the default is beacon (SKILL.md present)
        self.assertEqual(A.detect_mode("hello"), "beacon")


if __name__ == "__main__":
    unittest.main()
