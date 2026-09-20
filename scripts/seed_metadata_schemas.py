#!/usr/bin/env python3
"""Yerel/geliştirme ortamına kurumsal evrak üstveri şemalarını yükler.

Şema yayınlandıktan sonra alan eklenemez (domain kuralı), bu yüzden alanlar
yayından önce eklenir. Betik yeniden çalıştırılabilir: aynı anahtarlı şema
zaten varsa dokunulmaz.

Kullanım:
    python3 scripts/seed_metadata_schemas.py [--api http://localhost:5080/api/v1]
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

DEFAULT_API = "http://localhost:5080/api/v1"

SCHEMAS = [
    {
        "key": "evrak-ustverisi",
        "name": "Evrak Üstverisi",
        "version": 1,
        "fields": [
            {
                "key": "evrak_no",
                "label": "Evrak Sayısı / Kayıt No",
                "fieldType": "Text",
                "isRequired": True,
                "isSearchable": True,
                "isRepeatable": False,
                "optionsJson": None,
            },
            {
                "key": "evrak_tarihi",
                "label": "Evrak Tarihi",
                "fieldType": "Date",
                "isRequired": True,
                "isSearchable": True,
                "isRepeatable": False,
                "optionsJson": None,
            },
            {
                "key": "muhatap",
                "label": "Muhatap / Gönderilen Makam",
                "fieldType": "Text",
                "isRequired": False,
                "isSearchable": True,
                "isRepeatable": False,
                "optionsJson": None,
            },
            {
                "key": "gizlilik_derecesi",
                "label": "Gizlilik Derecesi",
                "fieldType": "Choice",
                "isRequired": True,
                "isSearchable": True,
                "isRepeatable": False,
                "optionsJson": json.dumps(
                    ["Normal", "Hizmete Özel", "Gizli", "Çok Gizli"],
                    ensure_ascii=False,
                ),
            },
            {
                "key": "sicil_no",
                "label": "Sicil No",
                "fieldType": "Text",
                "isRequired": False,
                "isSearchable": True,
                "isRepeatable": False,
                "optionsJson": None,
            },
            {
                "key": "etiket",
                "label": "Etiket",
                "fieldType": "Text",
                "isRequired": False,
                "isSearchable": True,
                "isRepeatable": False,
                "optionsJson": None,
            },
        ],
    },
]


def request(api: str, method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"{api}{path}",
        data=data,
        method=method,
        headers={"Accept": "application/json", "Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = response.read()
            return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise SystemExit(f"{method} {path} -> HTTP {error.code}\n{detail}") from error
    except urllib.error.URLError as error:
        raise SystemExit(f"API'ye ulaşılamadı ({api}): {error.reason}") from error


def existing_keys(api: str) -> set[str]:
    result = request(api, "GET", "/classification/metadata-schemas?page=1&pageSize=100")
    return {item["key"] for item in result.get("items", [])}


def seed(api: str) -> int:
    present = existing_keys(api)
    created = 0

    for schema in SCHEMAS:
        if schema["key"] in present:
            print(f"= {schema['key']} zaten var, atlandı")
            continue

        result = request(
            api,
            "POST",
            "/classification/metadata-schemas",
            {"key": schema["key"], "name": schema["name"], "version": schema["version"]},
        )
        schema_id = result["id"]
        print(f"+ {schema['key']} oluşturuldu ({schema_id})")

        for field in schema["fields"]:
            request(
                api,
                "POST",
                f"/classification/metadata-schemas/{schema_id}/fields",
                field,
            )
            print(f"    - {field['key']} ({field['fieldType']})")

        request(
            api,
            "POST",
            f"/classification/metadata-schemas/{schema_id}/publish",
        )
        print(f"  {schema['key']} yayınlandı")
        created += 1

    return created


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", default=DEFAULT_API, help=f"API kökü (varsayılan: {DEFAULT_API})")
    args = parser.parse_args()

    created = seed(args.api.rstrip("/"))
    print(f"\nTamamlandı: {created} yeni şema.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
