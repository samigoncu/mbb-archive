from __future__ import annotations
import csv, io, os, subprocess, tempfile
from PIL import Image
from models import PageResult,Word

class TesseractProvider:
    name="Tesseract"; version="5.x"
    def __init__(self,languages:str): self.languages=languages
    def recognize(self,page_number:int,image:Image.Image)->PageResult:
        with tempfile.NamedTemporaryFile(suffix=".png",delete=False) as temp: path=temp.name
        try:
            image.save(path,"PNG"); completed=subprocess.run(["tesseract",path,"stdout","-l",self.languages,"--psm","3","tsv"],capture_output=True,text=True,check=True)
            words=[]; texts=[]; confidences=[]
            for row in csv.DictReader(io.StringIO(completed.stdout),delimiter="	"):
                if row.get("level")!="5": continue
                text=(row.get("text") or "").strip()
                try: conf=float(row.get("conf") or -1)
                except ValueError: conf=-1
                if not text or conf<0: continue
                c=max(0,min(100,conf))/100.0; words.append(Word(text,c,int(row["left"]),int(row["top"]),int(row["width"]),int(row["height"]))); texts.append(text); confidences.append(c)
            avg=sum(confidences)/len(confidences) if confidences else 0.0
            return PageResult(page_number,image.width,image.height," ".join(texts),avg,words)
        finally:
            try: os.unlink(path)
            except FileNotFoundError: pass

class PaddleOcrProvider:
    name="PaddleOCR"; version="3.7.0"
    def __init__(self,languages:str):
        from paddleocr import PaddleOCR
        self.languages=languages; self._ocr=PaddleOCR(use_doc_orientation_classify=False,use_doc_unwarping=False,use_textline_orientation=False,engine="paddle")
    def recognize(self,page_number:int,image:Image.Image)->PageResult:
        with tempfile.NamedTemporaryFile(suffix=".png",delete=False) as temp: path=temp.name
        try:
            image.save(path,"PNG"); outputs=list(self._ocr.predict(path)); words=[]; texts=[]; confidences=[]
            for output in outputs:
                raw=getattr(output,"json",None)
                if callable(raw): raw=raw()
                data=raw if isinstance(raw,dict) else getattr(output,"res",None)
                if not isinstance(data,dict): continue
                data=data.get("res",data); rec_texts=list(data.get("rec_texts",[])); rec_scores=list(data.get("rec_scores",[])); rec_boxes=list(data.get("rec_boxes",[]))
                for idx,text in enumerate(rec_texts):
                    if not str(text).strip(): continue
                    score=float(rec_scores[idx]) if idx<len(rec_scores) else 0.0; box=rec_boxes[idx] if idx<len(rec_boxes) else [0,0,0,0]; x1,y1,x2,y2=[int(v) for v in box]
                    words.append(Word(str(text),max(0,min(1,score)),x1,y1,max(0,x2-x1),max(0,y2-y1))); texts.append(str(text)); confidences.append(score)
            avg=sum(confidences)/len(confidences) if confidences else 0.0
            return PageResult(page_number,image.width,image.height," ".join(texts),avg,words)
        finally:
            try: os.unlink(path)
            except FileNotFoundError: pass

def create_provider():
    languages=os.getenv("OCR_LANGUAGES","tur+eng"); provider=os.getenv("OCR_PROVIDER","tesseract").lower()
    return PaddleOcrProvider(languages) if provider=="paddle" else TesseractProvider(languages)
