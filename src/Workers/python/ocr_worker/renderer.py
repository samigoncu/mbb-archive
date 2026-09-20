from pathlib import Path
from PIL import Image
import pypdfium2 as pdfium

def render_pages(path:Path,mime_type:str,dpi:int=300,page_numbers:set[int]|None=None):
    if mime_type=="application/pdf":
        pdf=pdfium.PdfDocument(str(path)); scale=dpi/72
        try:
            for index in range(len(pdf)):
                if page_numbers is not None and index+1 not in page_numbers: continue
                page=pdf[index]
                try:
                    bitmap=page.render(scale=scale)
                    try: image=bitmap.to_pil().convert("RGB")
                    finally: bitmap.close()
                finally: page.close()
                try: yield index+1,image
                finally: image.close()
        finally: pdf.close()
    else:
        with Image.open(path) as source:
            frames=getattr(source,"n_frames",1)
            for index in range(frames): source.seek(index); yield index+1,source.convert("RGB").copy()
