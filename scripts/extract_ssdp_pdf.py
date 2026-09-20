#!/usr/bin/env python3
"""Extract the supplied 2024 V.4 PDF's ruled table (requires PyMuPDF).

Usage: python scripts/extract_ssdp_pdf.py source.pdf output.json
Keep the PDF SHA-256 and page references; fail on ambiguous table structure.
"""
import hashlib
import json
import re
import sys
from pathlib import Path
import fitz

SOURCE = 'https://www.devletarsivleri.gov.tr/varliklar/goruntuler/haberler/image/SSDP.PDF%20(2024%20V.4).pdf'

def extract(path):
    pdf = fitz.open(path)
    assert len(pdf) == 25, 'Expected the 25-page V.4 source'
    items, notes, stack = [], [], []
    section = None
    for page_number, page in enumerate(pdf):
        if page_number >= 22:
            notes.append({'page': page_number + 1, 'text': page.get_text().strip()})
            continue
        for table in page.find_tables().tables:
            assert table.col_count == 7
            for row in table.extract():
                values = [' '.join((v or '').split()) for v in row]
                codes = [(i, v) for i, v in enumerate(values[:4]) if re.fullmatch(r'\d{2,3}', v)]
                if not codes:
                    if values[0] and values[0] != 'Ana Dosya':
                        notes.append({'page': page_number + 1, 'text': ' '.join(v for v in values if v)})
                    continue
                assert len(codes) == 1, values
                column, value = codes[0]
                title, retention, disposal = values[4:]
                assert title
                if column == 0:
                    assert len(value) == 3
                    stack = [value]
                    is_section = bool(re.search(r'\(\d{3}-\d{3}\)', title))
                    parent = None if is_section else section
                    if is_section:
                        section = value
                    code = value
                else:
                    assert len(stack) >= column, values
                    stack = stack[:column] + [value]
                    code = '.'.join(stack)
                    parent = '.'.join(stack[:-1])
                    is_section = False
                level = 1 if parent is None else next(x['level'] for x in items if x['code'] == parent) + 1
                secondary_only = code == '020' or code.startswith('030.')
                description = f'SSDP 2024 V.4, sayfa {page_number + 1}. Saklama süresi: {retention or "alt başlıklarda"}. Tasfiye kodu: {disposal or "alt başlıklarda"}.'
                if secondary_only:
                    description += ' Yalnız ikinci dosya kodu olarak kullanılır; birincil dosyalama için seçilemez.'
                if is_section:
                    description += ' Bölüm başlığıdır; dosyalama için seçilemez.'
                description += ' Süre ve tasfiye kodu kaynak bilgisidir; otomatik imha talimatı değildir.'
                items.append(dict(code=code, parentCode=parent, title=title, level=level,
                    isSelectable=not is_section and not secondary_only,
                    retention=retention or None, disposal=disposal or None,
                    sourcePage=page_number + 1, description=description))
    assert len(items) == 718, len(items)
    assert len({x['code'] for x in items}) == len(items)
    return dict(code='DAB-SSDP-2024', name='Saklama Süreli Standart Dosya Planı',
        version='2024 V.4', authority='Devlet Arşivleri Başkanlığı', effectiveFrom='2024-01-02',
        effectiveTo=None, sourceUrl=SOURCE, sourceSha256=hashlib.sha256(Path(path).read_bytes()).hexdigest(),
        items=items, sourceNotes=notes)

if __name__ == '__main__':
    result = extract(sys.argv[1])
    Path(sys.argv[2]).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(result["items"])} unique codes extracted')
