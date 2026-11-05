"""Classify exact Next build keys without exempting files or public bundles."""
import base64
import json
from pathlib import Path
import re

NEXT_VERSION = "16.4.1"
FIELDS = {
    "cache/.rscinfo": [("encryption.key",)],
    "cache/.previewinfo": [("previewModeSigningKey",), ("previewModeEncryptionKey",)],
    "server/preview-props.json": [("previewModeSigningKey",), ("previewModeEncryptionKey",)],
    "server/server-reference-manifest.json": [("encryptionKey",)],
    "prerender-manifest.json": [("preview", "previewModeSigningKey"), ("preview", "previewModeEncryptionKey")],
}


def artifact_policy(root: Path, artifact: Path, destination: Path):
    root, artifact = root.resolve(), artifact.resolve()
    if artifact != root / ".next":
        return None, None
    lock = json.loads((root / "package-lock.json").read_text(encoding="utf-8"))
    if lock.get("packages", {}).get("node_modules/next", {}).get("version") != NEXT_VERSION:
        raise ValueError("Review Next artifact policy after a framework version change")
    config = ["[extend]", "useDefault = true", "", "[[rules]]", 'id = "generic-api-key"']
    classified, keys = [], set()
    for relative, fields in FIELDS.items():
        file = artifact / relative
        if not file.is_file():
            continue
        if file.is_symlink() or not file.resolve().is_relative_to(artifact):
            raise ValueError("Unexpected Next metadata path")
        data = json.loads(file.read_text(encoding="utf-8"))
        values = []
        for field in fields:
            value = data
            for name in field:
                value = value[name]
            if not isinstance(value, str):
                raise ValueError("Unexpected Next metadata key type")
            if field[-1] in ("encryptionKey", "encryption.key"):
                if len(base64.b64decode(value, validate=True)) != 32:
                    raise ValueError("Unexpected Next encryption key format")
            elif not re.fullmatch(r"[0-9a-f]{64}", value):
                raise ValueError("Unexpected Next preview key format")
            values.append(value)
            keys.add(value.encode("ascii"))
            classified.append({"file": file.relative_to(root).as_posix(), "field": ".".join(field)})
        # Both the exact private metadata path AND exact generated value must match.
        # A different secret in this file, or the same value elsewhere, still fails.
        config.extend(["", "[[rules.allowlists]]", 'description = "Exact private Next build key"',
                       'condition = "AND"', 'regexTarget = "secret"',
                       "paths = [" + json.dumps("^" + re.escape(file.as_posix()) + "$") + "]",
                       "regexes = [" + json.dumps("^(?:" + "|".join(re.escape(v) for v in values) + ")$") + "]"])
    if not classified:
        raise ValueError("Expected Next build metadata is missing")
    exposures = []
    for public_root in (artifact / "static", root / "public"):
        if not public_root.is_dir():
            continue
        for file in public_root.rglob("*"):
            if not file.is_file():
                continue
            if file.is_symlink() or not file.resolve().is_relative_to(public_root.resolve()):
                raise ValueError("Unexpected public artifact path")
            content = file.read_bytes()
            if any(key in content for key in keys):
                exposures.append({"file": file.relative_to(root).as_posix()})
    # The ephemeral config contains build keys. Never publish or print it.
    destination.write_text("\n".join(config) + "\n", encoding="utf-8")
    return destination, {"nextVersion": NEXT_VERSION, "classifiedPrivateFields": classified,
                         "publicExposureFindings": exposures,
                         "scope": "Exact values in exact private metadata paths only; default rules retained"}
