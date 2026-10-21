import base64
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from next_artifact_policy import artifact_policy


class NextArtifactPolicyTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="g1-next-policy-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.artifact = self.root / ".next"
        (self.artifact / "server").mkdir(parents=True)
        self.metadata = self.artifact / "server/server-reference-manifest.json"
        self.key = base64.b64encode(secrets.token_bytes(32)).decode("ascii")
        self.metadata.write_text(json.dumps({"node": {}, "edge": {}, "encryptionKey": self.key}))
        (self.root / "package-lock.json").write_text(json.dumps({"packages": {"node_modules/next": {"version": "16.4.1"}}}))

    def scan(self, config):
        binary = os.environ.get("H3_GITLEAKS") or shutil.which("gitleaks")
        self.assertTrue(binary, "Install the pinned scanner before running the security policy tests")
        report = self.root / "report.json"
        result = subprocess.run([binary, "dir", str(self.artifact), "--no-banner", "--no-color", "--redact=100",
                                 "--ignore-gitleaks-allow", "--config", str(config), "--report-format=json",
                                 "--report-path", str(report)], capture_output=True)
        return result.returncode, len(json.loads(report.read_text(encoding="utf-8-sig"))) if report.exists() else -1

    def policy(self):
        return artifact_policy(self.root, self.artifact, self.root / "policy.toml")

    def test_exact_private_generated_key_is_classified_without_exporting_it(self):
        config, summary = self.policy()
        self.assertNotIn(self.key, json.dumps(summary))
        self.assertEqual(len(summary["classifiedPrivateFields"]), 1)
        self.assertEqual(summary["publicExposureFindings"], [])
        self.assertEqual(self.scan(config), (0, 0))

    def test_same_key_in_public_bundle_is_rejected(self):
        (self.artifact / "static").mkdir()
        (self.artifact / "static/leak.js").write_text('const api_key = "' + self.key + '";')
        config, summary = self.policy()
        self.assertEqual(len(summary["publicExposureFindings"]), 1)
        code, count = self.scan(config)
        self.assertEqual(code, 1)
        self.assertGreater(count, 0)

    def test_unrelated_secret_in_classified_file_is_rejected(self):
        data = json.loads(self.metadata.read_text())
        data["api_key"] = secrets.token_hex(32)
        self.metadata.write_text(json.dumps(data))
        config, _ = self.policy()
        code, count = self.scan(config)
        self.assertEqual(code, 1)
        self.assertGreater(count, 0)

    def test_generated_key_in_public_assets_is_reported(self):
        (self.root / "public").mkdir()
        (self.root / "public/leak.txt").write_text(self.key)
        _, summary = self.policy()
        self.assertEqual(summary["publicExposureFindings"], [{"file": "public/leak.txt"}])

    def test_framework_version_or_metadata_shape_changes_fail_closed(self):
        (self.root / "package-lock.json").write_text(json.dumps({"packages": {"node_modules/next": {"version": "99.0.0"}}}))
        with self.assertRaises(ValueError):
            self.policy()
        (self.root / "package-lock.json").write_text(json.dumps({"packages": {"node_modules/next": {"version": "16.4.1"}}}))
        self.metadata.write_text(json.dumps({"encryptionKey": "not-a-generated-key"}))
        with self.assertRaises(ValueError):
            self.policy()


if __name__ == "__main__":
    unittest.main()
