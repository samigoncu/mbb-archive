from __future__ import annotations
import csv,json,sys
from pathlib import Path

def main(path:str)->None:
 rows=[]
 with Path(path).open(encoding="utf-8-sig",newline="") as handle:
  for row in csv.DictReader(handle):
   rows.append({"code":(row.get("code") or row.get("Kod") or "").strip(),"title":(row.get("title") or row.get("Konu") or row.get("Başlık") or "").strip(),"parentCode":(row.get("parentCode") or row.get("Üst Kod") or "").strip() or None,"level":int(row.get("level") or row.get("Seviye") or 1),"isSelectable":str(row.get("isSelectable") or "true").lower() in {"true","1","yes","evet"}})
 print(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=="__main__":
 if len(sys.argv)!=2: raise SystemExit("Usage: python scripts/file_plan_csv_to_json.py <plan.csv>")
 main(sys.argv[1])
