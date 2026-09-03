from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("backup_file")
    parser.add_argument("--database", required=True)
    parser.add_argument("--output")
    args = parser.parse_args()

    backup = Path(args.backup_file).resolve()
    if not backup.is_file():
        raise SystemExit(f"Backup file does not exist: {backup}")

    manifest = {
        "schemaVersion": "mbb.archive.backup-manifest.v1",
        "database": args.database,
        "backupFile": backup.name,
        "sizeBytes": backup.stat().st_size,
        "sha256": sha256(backup),
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
    }

    output = Path(args.output) if args.output else backup.with_suffix(backup.suffix + ".manifest.json")
    output.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
