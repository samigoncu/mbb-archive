import Link from "next/link";
import { FileText, Grid2X2, List, ChevronRight, ChevronLeft, FolderTree, Search, SearchX, ShieldCheck } from "lucide-react";
import { searchDocuments } from "@/features/search/api/search-documents";
import { getPublishedMetadataSchemas } from "@/features/classification/api/get-classification";
import { searchableFields } from "@/features/search/model/conditions";
import { formatSearchDate } from "@/features/search/model/search-dates";
import { HighlightedText } from "@/features/search/components/highlighted-text";
import { DiscoverySearch } from "@/features/discovery/discovery-search";
import { discoveryHref, discoveryPageSize, discoverySorts, discoveryState, formatFileType } from "@/features/discovery/discovery-state";
import { ApiError } from "@/lib/api/api-client";
import styles from "@/features/discovery/discovery.module.css";
export const metadata={title:"Arşivi Keşfet"};
export default async function DiscoveryPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const schemaResult=await getPublishedMetadataSchemas().then(data=>({data,error:false})).catch(()=>({data:[],error:true}));
  const fields=searchableFields(schemaResult.data);
  const state=discoveryState(params,["keyword","title",...fields.map(f=>f.key)]);
  let error=state.error;
  const hasSearch=Boolean(state.q || state.active.mimeType || state.active.filePlanCode || state.active.from || state.active.to);
  const response=hasSearch && !error?await searchDocuments(state.criteria).catch((e:unknown)=>{error=e instanceof ApiError&&e.status<500?e.message:"Arşiv aramasına ulaşılamadı. Yeniden deneyin.";return null;}):null;
  const back=discoveryHref(state.active,{page:String(state.page)});
  const lastPage=Math.max(1,Math.ceil(Math.min(response?.total??0,9996)/discoveryPageSize));
  return <>
    <DiscoverySearch key={JSON.stringify(params)} q={state.q} field={state.field} fields={fields} active={state.active}/>
    <div className={styles.content}>
      <nav aria-label="İçerik yolu" className={styles.breadcrumb}><Link href="/kesfet">Arşiv</Link><ChevronRight size={14}/><span>{state.q?"Arama sonuçları":"Keşfet"}</span></nav>
      <div className={styles.resultsLayout}>
        <aside className={styles.filters}><h2>Arşivde gezin</h2>
          <div className={styles.scope}><ShieldCheck size={20}/><p>Sonuçlar ve filtre sayıları erişim yetkilerinize göre gösterilir.</p></div>
          <label className={styles.filterGroup}><strong>Belge türü</strong><select name="mimeType" form="discovery-search" defaultValue={state.active.mimeType??""} key={state.active.mimeType??"all"}><option value="">Tüm türler</option>{state.active.mimeType&&!response?.mimeTypes.some(f=>f.key===state.active.mimeType)&&<option value={state.active.mimeType}>{formatFileType(state.active.mimeType)}</option>}{response?.mimeTypes.map(f=><option key={f.key} value={f.key}>{formatFileType(f.key)} ({f.count})</option>)}</select></label>
          <label className={styles.filterGroup}><strong><FolderTree size={16}/>Standart dosya planı</strong><select name="filePlanCode" form="discovery-search" defaultValue={state.active.filePlanCode??""} key={state.active.filePlanCode??"all"}><option value="">Tüm konular</option>{state.active.filePlanCode&&!response?.filePlanCodes.some(f=>f.key===state.active.filePlanCode)&&<option value={state.active.filePlanCode}>{state.active.filePlanCode.split(":").at(-1)}</option>}{response?.filePlanCodes.map(f=><option key={f.key} value={f.key}>{f.key.split(":").at(-1)} ({f.count})</option>)}</select></label>
          <button form="discovery-search" type="submit" className={styles.primary}>Filtreleri uygula</button><Link href="/kesfet" className={styles.clear}>Tüm filtreleri temizle</Link>
          <p className={styles.hint}>Başlık ve içerikte arayabilir, yayınlanmış üstveri alanlarıyla sonuçları daraltabilirsiniz.</p>
        </aside>
        <section className={styles.results} aria-label="Arşiv sonuçları">
          <div className={styles.resultsHeading}><div><span className={styles.kicker}>KEŞFET</span><h2>{state.q?"Arama sonuçları":hasSearch?"Arşiviniz":"Arşivde Arama"}</h2><p>{!hasSearch?"Aramaya başlamak için bir anahtar kelime veya filtre seçin.":<>{state.q&&<>“{state.q}” · </>}{response?<><strong>{response.total.toLocaleString("tr-TR")}</strong> sonuç</>:"Sonuçlar alınamadı"}</>}</p></div>
            {hasSearch&&<div className={styles.resultTools}><label>Sıralama<select name="sort" form="discovery-search" defaultValue={state.sort} key={state.sort}>{discoverySorts.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label><button type="submit" form="discovery-search" className={styles.outline}>Uygula</button><div className={styles.views}><Link href={discoveryHref(state.active,{view:"grid",page:String(state.page)})} aria-label="Kart görünümü" aria-current={state.view==="grid"?"true":undefined}><Grid2X2 size={18}/></Link><Link href={discoveryHref(state.active,{view:"list",page:String(state.page)})} aria-label="Liste görünümü" aria-current={state.view==="list"?"true":undefined}><List size={18}/></Link></div></div>}
          </div>
          {schemaResult.error&&<p className={styles.notice}>Üstveri alanları yüklenemedi. Başlık ve içerik araması kullanılabilir.</p>}
          {!hasSearch?<div className={styles.empty}><Search size={36}/><h3>Aramaya Başlayın</h3><p>Arşivdeki belgeleri listelemek için yukarıdaki arama kutusuna bir kelime yazın veya filtreleri kullanarak arama yapın.</p></div>:error?<p role="alert" className={styles.error}>{error}</p>:response&&!response.hits.length?<div className={styles.empty}><SearchX size={36}/><h3>Gösterilecek belge bulunamadı</h3><p>Arama koşullarını azaltın. Belgeleriniz burada görünmüyorsa birim ve erişim atamalarınızı kontrol ettirin.</p></div>:<div className={state.view==="list"?styles.list:styles.cards}>
            {response?.hits.map(hit=>{const href=`/kesfet/${hit.documentId}?back=${encodeURIComponent(back)}`;return <article key={hit.documentId} className={styles.card}>
              <Link href={href} tabIndex={-1} aria-hidden className={styles.preview}>
                {hit.mimeType==="application/pdf"?<iframe loading="lazy" tabIndex={-1} title={`${hit.title} — ilk sayfa`} src={`/api/documents/${hit.documentId}/content#page=1&toolbar=0&navpanes=0&view=FitH`}/>:hit.mimeType&&["image/png","image/jpeg","image/webp","image/gif"].includes(hit.mimeType)?<img loading="lazy" src={`/api/documents/${hit.documentId}/content`} alt=""/>:<FileText size={64} strokeWidth={1}/>}
                <span className={styles.type}>{formatFileType(hit.mimeType)}</span>
              </Link>
              <div className={styles.cardBody}><h3><Link href={href}>{hit.title}</Link></h3><p className={styles.date}>Yüklenme · {formatSearchDate(hit.ingestedAt)}</p>{hit.fragments.length>0&&<p className={styles.snippet}><HighlightedText fragment={hit.fragments[0]}/></p>}<Link href={href} className={styles.open}>Belgeyi görüntüle <ChevronRight size={16}/></Link></div>
            </article>;})}
          </div>}
          {response&&response.total>0&&<nav aria-label="Sonuç sayfaları" className={styles.pagination}>{state.page>1&&<Link href={discoveryHref(state.active,{page:String(state.page-1)})}><ChevronLeft size={16}/>Önceki</Link>}<span>Sayfa {state.page} / {lastPage}</span>{state.page<lastPage&&<Link href={discoveryHref(state.active,{page:String(state.page+1)})}>Sonraki<ChevronRight size={16}/></Link>}</nav>}
          {!!response&&response.total>9996&&<p className={styles.hint}>İlk 9.996 sonuç gösterilebilir. Filtrelerle aramanızı daraltın.</p>}
        </section>
      </div>
    </div>
  </>;
}
