#!/usr/bin/env python3
"""Sahibi birimi olmayan belgeleri raporlar ve karantina birimine bağlar.

Kapsam süzgeci devreye girdiğinde sahibi olmayan belge kimseye görünmez —
bu bilinçlidir: birimi belirsiz bir belge sessizce herkese açılmamalıdır.
Ancak bu belgelerin kaybolmaması için karantinaya alınıp raporlanmaları gerekir.

Betik iki adımlıdır ve varsayılan olarak **hiçbir şey yazmaz**:

    python3 scripts/backfill_document_units.py            # yalnız rapor
    python3 scripts/backfill_document_units.py --apply    # karantinaya bağla

Karantina birimi (KARANTINA) kurumsal ağacın kökünde durur; yalnız
`documents.read.all` iznine sahip özneler (Teftiş, Genel Sekreterlik) görür.
Belgeler oradan doğru birimlerine elle taşınır.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys

QUARANTINE_CODE = "KARANTINA"

#: Yerelde psql kurulu değilse kullanılacak geliştirme konteyneri.
CONTAINER = os.environ.get("ARCHIVE_PG_CONTAINER", "mbb-archive-postgres")

DEFAULT_DSN = (
    "postgresql://mbb_archive:change-me-local-only@localhost:5432/mbb_archive"
)


def psql(dsn: str, sql: str) -> list[list[str]]:
    """
    psql üzerinden sorgu çalıştırır; ek Python bağımlılığı istemez.
    Yerelde psql yoksa geliştirme ortamındaki Postgres konteynerine düşer.
    """
    command = (
        ["psql", dsn, "-t", "-A", "-F", "\t", "-c", sql]
        if shutil.which("psql")
        else [
            "docker", "exec", "-i", CONTAINER,
            "psql", "-U", "mbb_archive", "-d", "mbb_archive",
            "-t", "-A", "-F", "\t", "-c", sql,
        ]
    )

    result = subprocess.run(command, capture_output=True, text=True)

    if result.returncode != 0:
        print(result.stderr.strip(), file=sys.stderr)
        sys.exit(1)

    return [
        line.split("\t")
        for line in result.stdout.strip().split("\n")
        if line.strip()
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dsn", default=os.environ.get("ARCHIVE_DSN", DEFAULT_DSN))
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Raporla yetinme, sahipsiz belgeleri karantina birimine bağla.",
    )
    args = parser.parse_args()

    orphans = psql(
        args.dsn,
        """
        SELECT id, left(title, 60), created_at::date
        FROM documents.documents
        WHERE owner_unit_path IS NULL
        ORDER BY created_at
        """,
    )

    if not orphans:
        print("Sahibi belirlenmemiş belge yok.")
        return 0

    print(f"Sahibi belirlenmemiş {len(orphans)} belge:\n")

    for document_id, title, created in orphans[:50]:
        print(f"  {created}  {document_id[:8]}…  {title}")

    if len(orphans) > 50:
        print(f"  … ve {len(orphans) - 50} belge daha")

    if not args.apply:
        print(
            "\nHiçbir şey yazılmadı. Karantinaya bağlamak için --apply ile çalıştırın."
        )
        return 0

    quarantine = psql(
        args.dsn,
        f"SELECT id, path FROM organization.units WHERE code = '{QUARANTINE_CODE}'",
    )

    if not quarantine:
        print(
            f"\n! '{QUARANTINE_CODE}' birimi yok. Önce scripts/seed_organization.py çalıştırın.",
            file=sys.stderr,
        )
        return 1

    unit_id, unit_path = quarantine[0]

    psql(
        args.dsn,
        f"""
        UPDATE documents.documents
        SET owner_unit_id = '{unit_id}',
            owner_unit_path = '{unit_path}',
            concurrency_version = concurrency_version + 1
        WHERE owner_unit_path IS NULL
        """,
    )

    print(f"\n{len(orphans)} belge {QUARANTINE_CODE} ({unit_path}) birimine bağlandı.")
    print(
        "Arama projeksiyonunun tazelenmesi için belgelerin yeniden indekslenmesi gerekir."
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
