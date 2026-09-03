from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest")
    parser.add_argument("--backup-dir")
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    data = json.loads(manifest_path.read_text(encoding="utf-8"))

    backup_dir = Path(args.backup_dir).resolve() if args.backup_dir else manifest_path.parent
    backup = backup_dir / data["backupFile"]

    if not backup.is_file():
        raise SystemExit("FAILED: backup file is missing")

    actual_size = backup.stat().st_size
    actual_sha = sha256(backup)

    if actual_size != data["sizeBytes"]:
        raise SystemExit("FAILED: size mismatch")

    if actual_sha.lower() != data["sha256"].lower():
        raise SystemExit("FAILED: SHA-256 mismatch")

    print("PASSED")
    print(f"database={data['database']}")
    print(f"sizeBytes={actual_size}")
    print(f"sha256={actual_sha}")


if __name__ == "__main__":
    main()
