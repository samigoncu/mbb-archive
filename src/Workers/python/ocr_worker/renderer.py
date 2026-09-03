from pathlib import Path
from PIL import Image
import pypdfium2 as pdfium

def render_pages(path:Path,mime_type:str,dpi:int=200):
    if mime_type=="application/pdf":
        pdf=pdfium.PdfDocument(str(path)); scale=dpi/72
        try:
            for index in range(len(pdf)):
                page=pdf[index]; bitmap=page.render(scale=scale); image=bitmap.to_pil().convert("RGB"); yield index+1,image
        finally: pdf.close()
    else:
        with Image.open(path) as source:
            frames=getattr(source,"n_frames",1)
            for index in range(frames): source.seek(index); yield index+1,source.convert("RGB").copy()
