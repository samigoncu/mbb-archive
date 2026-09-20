#!/usr/bin/env python3
"""Malatya Büyükşehir Belediyesi teşkilat şemasını arşive yükler.

Tanımlamalar ekranındaki sabit liste tedarikçi firmanın şirket yapısıydı
(DİJİTAL ARŞİV A.Ş., YEDİTEPE LTD.ŞTİ. …). Buradaki ağaç 5216 sayılı Büyükşehir
Belediyesi Kanunu'na göre kurulan gerçek daire başkanlığı / şube müdürlüğü
yapısıdır.

Betik yeniden çalıştırılabilir: aynı kodlu birim varsa dokunulmaz.

Kullanım:
    python3 scripts/seed_organization.py [--api http://localhost:5080/api/v1]
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

DEFAULT_API = "http://localhost:5080/api/v1"

# (kod, ad, kısa ad, üst birim kodu)
UNITS: list[tuple[str, str, str | None, str | None]] = [
    ("MBB", "Malatya Büyükşehir Belediyesi", "MBB", None),
    ("BASKANLIK", "Başkanlık Makamı", "BŞK", "MBB"),
    ("GS", "Genel Sekreterlik", "GS", "MBB"),
    ("TEFTIS", "Teftiş Kurulu Başkanlığı", "TFT", "MBB"),
    # Karantina: sahibi belirlenemeyen eski belgeler buraya alınır ve
    # yalnız kapsam üstü izni olanlar görür.
    ("KARANTINA", "Sahipsiz Kayıtlar (Karantina)", "KRN", "MBB"),

    ("BID", "Bilgi İşlem Dairesi Başkanlığı", "BİD", "GS"),
    ("BID-YAZ", "Yazılım Şube Müdürlüğü", "YAZ", "BID"),
    ("BID-SIS", "Sistem ve Ağ Şube Müdürlüğü", "SİS", "BID"),
    ("BID-CBS", "Coğrafi Bilgi Sistemleri Şube Müdürlüğü", "CBS", "BID"),

    ("IKE", "İnsan Kaynakları ve Eğitim Dairesi Başkanlığı", "İKE", "GS"),
    ("IKE-OZL", "Özlük İşleri Şube Müdürlüğü", "ÖZL", "IKE"),
    ("IKE-EGT", "Eğitim Şube Müdürlüğü", "EĞT", "IKE"),

    ("MHD", "Mali Hizmetler Dairesi Başkanlığı", "MHD", "GS"),
    ("MHD-BUT", "Bütçe ve Muhasebe Şube Müdürlüğü", "BÜT", "MHD"),
    ("MHD-GEL", "Gelirler Şube Müdürlüğü", "GEL", "MHD"),

    ("IMR", "İmar ve Şehircilik Dairesi Başkanlığı", "İMR", "GS"),
    ("IMR-PLN", "Planlama Şube Müdürlüğü", "PLN", "IMR"),
    ("IMR-RUH", "Yapı Ruhsat Şube Müdürlüğü", "RUH", "IMR"),

    ("ULS", "Ulaşım Dairesi Başkanlığı", "ULŞ", "GS"),
    ("ULS-UKOME", "UKOME Şube Müdürlüğü", "UKOME", "ULS"),
    ("ULS-TOP", "Toplu Taşıma Şube Müdürlüğü", "TOP", "ULS"),

    ("FEN", "Fen İşleri Dairesi Başkanlığı", "FEN", "GS"),
    ("FEN-YOL", "Yol Yapım ve Bakım Şube Müdürlüğü", "YOL", "FEN"),

    ("YAZ", "Yazı İşleri ve Kararlar Dairesi Başkanlığı", "YİK", "GS"),
    ("YAZ-MEC", "Meclis ve Encümen Şube Müdürlüğü", "MEC", "YAZ"),
    ("YAZ-ARS", "Kurum Arşivi Şube Müdürlüğü", "ARŞ", "YAZ"),

    ("HUK", "Hukuk Müşavirliği", "HUK", "GS"),
    ("DES", "Destek Hizmetleri Dairesi Başkanlığı", "DES", "GS"),
    ("DES-IHL", "İhale Şube Müdürlüğü", "İHL", "DES"),
]


def request(api: str, method: str, path: str, payload: dict | None = None) -> dict | None:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None

    req = urllib.request.Request(
        f"{api}{path}",
        data=data,
        headers={"Content-Type": "application/json"} if data else {},
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")

        if error.code == 409:
            return None  # zaten var

        print(f"  ! {method} {path} -> HTTP {error.code}: {detail[:200]}", file=sys.stderr)
        return None
    except urllib.error.URLError as error:
        print(f"  ! API'ye ulaşılamadı: {error.reason}", file=sys.stderr)
        sys.exit(1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default=DEFAULT_API)
    args = parser.parse_args()

    existing = request(args.api, "GET", "/organization/units?includeInactive=true") or []
    by_code = {unit["code"]: unit["id"] for unit in existing}

    created = 0

    for code, name, short_name, parent_code in UNITS:
        if code in by_code:
            continue

        parent_id = by_code.get(parent_code) if parent_code else None

        if parent_code and parent_id is None:
            print(f"  ! {code}: üst birim {parent_code} bulunamadı, atlandı", file=sys.stderr)
            continue

        result = request(
            args.api,
            "POST",
            "/organization/units",
            {
                "code": code,
                "name": name,
                "shortName": short_name,
                "parentId": parent_id,
                "externalReference": None,
            },
        )

        if result is None:
            continue

        by_code[code] = result["id"]
        created += 1
        indent = "  " if parent_code else ""
        print(f"  ✓ {indent}{code:<12} {name}")

    print(f"\n{created} birim eklendi, {len(by_code)} birim tanımlı.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
