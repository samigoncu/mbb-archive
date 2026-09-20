#!/usr/bin/env python3
"""Arşiv kayıtlarının sahibi birim yolunu belgelerden kopyalar.

Kayıt beyanı listesi (`GET /api/v1/archive/records`) kapsam süzgecini kendi
tablosundaki `owner_unit_path` sütunu üzerinden uygular; belgeye gitmez.
Sütun bu sürümde eklendiği için mevcut kayıtlarda boştur ve boş kalan kayıt
kapsamlı kullanıcıya **görünmez** — sessizce herkese açılmasındansa doğrusu
budur, ama kayıtların kaybolmaması için bir kez doldurulmaları gerekir.

    python3 scripts/backfill_archive_record_units.py            # yalnız rapor
    python3 scripts/backfill_archive_record_units.py --apply    # yaz

Önce scripts/backfill_document_units.py çalıştırılmalıdır: belgede yol yoksa
kayda kopyalanacak bir şey de yoktur.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys

CONTAINER = os.environ.get("ARCHIVE_PG_CONTAINER", "mbb-archive-postgres")

DEFAULT_DSN = (
    "postgresql://mbb_archive:change-me-local-only@localhost:5432/mbb_archive"
)


def psql(dsn: str, sql: str) -> list[list[str]]:
    """psql üzerinden sorgu çalıştırır; yerelde yoksa konteynere düşer."""
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
        help="Raporla yetinme, sahibi birim yolunu kayıtlara yaz.",
    )
    args = parser.parse_args()

    pending = psql(
        args.dsn,
        """
        SELECT r.id,
               r.document_id,
               coalesce(d.owner_unit_path, '(belge de sahipsiz)')
        FROM archive.records r
        LEFT JOIN documents.documents d ON d.id = r.document_id
        WHERE r.owner_unit_path IS DISTINCT FROM d.owner_unit_path
        ORDER BY r.created_at
        """,
    )

    if not pending:
        print("Tüm arşiv kayıtlarının sahibi birim yolu belgeyle aynı.")
        return 0

    without_source = [row for row in pending if row[2].startswith("(")]

    print(f"Güncellenecek {len(pending)} arşiv kaydı:\n")

    for record_id, document_id, path in pending[:50]:
        print(f"  {record_id[:8]}…  belge {document_id[:8]}…  → {path}")

    if len(pending) > 50:
        print(f"  … ve {len(pending) - 50} kayıt daha")

    if without_source:
        print(
            f"\n! {len(without_source)} kaydın belgesinde de sahibi birim yok. "
            "Önce scripts/backfill_document_units.py --apply çalıştırın; "
            "bunlar boş kalacak ve kapsamlı kullanıcıya görünmeyecek."
        )

    if not args.apply:
        print("\nHiçbir şey yazılmadı. Yazmak için --apply ile çalıştırın.")
        return 0

    # Eşzamanlılık damgası artırılır: kayıt gövdesi değişmese de görünürlük
    # kopyası değişti; açık bir izleyici bunu bayat okumasın.
    psql(
        args.dsn,
        """
        UPDATE archive.records r
        SET owner_unit_path = d.owner_unit_path,
            concurrency_version = r.concurrency_version + 1
        FROM documents.documents d
        WHERE d.id = r.document_id
          AND r.owner_unit_path IS DISTINCT FROM d.owner_unit_path
          AND d.owner_unit_path IS NOT NULL
        """,
    )

    written = len(pending) - len(without_source)
    print(f"\n{written} arşiv kaydının sahibi birim yolu güncellendi.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
