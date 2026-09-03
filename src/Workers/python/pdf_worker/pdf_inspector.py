from dataclasses import dataclass
from pathlib import Path
from pypdf import PdfReader

@dataclass(frozen=True)
class PdfInspection:
    page_count:int; pdf_version:str; encrypted:bool; has_embedded_text:bool; requires_ocr:bool; extracted_character_count:int
    # Gömülü metin katmanı varsa OCR çalışmaz; aranabilir metin bu katmandan
    # gelir, bu yüzden sayfa metinleri de taşınır.
    page_texts:tuple[str,...]=()

class PdfInspector:
    def __init__(self,min_chars_per_page:int=24,sample_pages:int=12): self.min_chars_per_page=min_chars_per_page; self.sample_pages=sample_pages
    def inspect(self,path:Path)->PdfInspection:
        reader=PdfReader(str(path),strict=False); encrypted=bool(reader.is_encrypted)
        if encrypted:
            try: reader.decrypt("")
            except Exception: pass
            if reader.is_encrypted: return PdfInspection(0,getattr(reader,"pdf_header","unknown"),True,False,False,0)
        pages=len(reader.pages); chars=0; sample_texts=[]
        for page in reader.pages[:min(pages,self.sample_pages)]:
            try: text=(page.extract_text() or "").strip()
            except Exception: text=""
            sample_texts.append(text); chars+=len(text)
        sampled=max(1,min(pages,self.sample_pages)); has_text=chars >= self.min_chars_per_page*sampled
        page_texts=()
        if has_text:
            # Örnekleme yalnız karar için; metin çıkarımı tüm sayfalarda yapılır.
            if pages<=self.sample_pages: page_texts=tuple(sample_texts)
            else:
                all_texts=list(sample_texts)
                for page in reader.pages[self.sample_pages:]:
                    try: all_texts.append((page.extract_text() or "").strip())
                    except Exception: all_texts.append("")
                page_texts=tuple(all_texts)
        return PdfInspection(pages,getattr(reader,"pdf_header","unknown"),False,has_text,not has_text,chars,page_texts)
