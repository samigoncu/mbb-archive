"""Read-only local menu route audit; HTTP evidence is not visual acceptance testing."""
import concurrent.futures,json,urllib.request,urllib.error,urllib.parse,re
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.text=[];self.ignore=0;self.buttons=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ['script','style']:self.ignore+=1
  if tag=='a' and a.get('href','').startswith('/'):self.links.append(a['href'])
 def handle_endtag(self,tag):
  if tag in ['script','style']:self.ignore=max(0,self.ignore-1)
 def handle_data(self,data):
  if not self.ignore:self.text.append(data)
def check(path):
 try:
  with urllib.request.urlopen('http://localhost:3000'+path,timeout=40) as r:html=r.read().decode();status=r.status
  p=Page();p.feed(html);text=' '.join(p.text)
  errors=[phrase for phrase in ['Application error','Internal Server Error','Bir hata oluştu','yüklenemedi','alınamadı','yapılandırılma','tanımlı değil'] if phrase.lower() in text.lower()]
  return {'path':path,'status':status,'errors':errors,'links':sorted(set(p.links)),'text':text[:16000]}
 except Exception as e:return {'path':path,'status':getattr(e,'code',0),'error':str(e)}
paths=sorted('/'+str(p.parent.relative_to(root/'web/src/app')) for p in (root/'web/src/app').rglob('page.tsx') if '[' not in str(p));paths=['/' if p=='/.' else p for p in paths]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(check,paths))
known=set(paths);extra=set()
for row in results:
 for link in row.get('links',[]):
  path=link.split('#')[0]
  if path and not path.startswith('/api/') and path not in known:extra.add(path)
extra=sorted(extra)[:150]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results+=list(pool.map(check,extra))
for row in results:
 row.pop('text',None);row.pop('links',None)
(root/'docs/quality/menu-route-audit-2026-09-10.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print('Checked',len(results),'routes; base',len(paths),'linked',len(extra))
for r in results:
 if r['status']!=200 or r.get('errors'):print(r['path'],r['status'],r.get('errors',r.get('error')))
