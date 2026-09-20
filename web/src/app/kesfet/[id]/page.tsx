import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import { ApiError } from "@/lib/api/api-client";
import { getDocumentById } from "@/features/documents/api/get-document-by-id";
import { getDocumentVersions } from "@/features/documents/api/get-document-versions";
import { documentContentUrl, getDocumentFolders } from "@/features/documents/api/get-document-context";
import { documentStatusLabels } from "@/features/documents/model/document";
import { OfficePreview } from "@/features/documents/components/office-preview";
import { DocumentFullscreen } from "@/features/documents/components/document-fullscreen";
import { officeMimeTypes } from "@/features/documents/model/office-formats";
import { isRenditionSupported } from "@/features/documents/model/office-formats";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { formatSearchDate } from "@/features/search/model/search-dates";
import { DiscoverySearch } from "@/features/discovery/discovery-search";
import { discoveryBack, formatFileType, single } from "@/features/discovery/discovery-state";
import styles from "@/features/discovery/discovery.module.css";
export const metadata={title:"Belge · MBB Arşivi Keşfet"};
export default async function DiscoveryDocument({params,searchParams}: {params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {id}=await params;const query=await searchParams;const back=discoveryBack(single(query.back));
  const details=await getDocumentById(id).catch((error:unknown)=>{if(error instanceof ApiError&&error.status===404)notFound();throw error;});
  if(details.status==="Cancelled")notFound();
  const [versions,user,foldersResult]=await Promise.all([getDocumentVersions(id),getCurrentUser(),getDocumentFolders(id).then(folders=>({folders,error:false})).catch(()=>({folders:[],error:true}))]);
  const requested=single(query.version);if(requested&&!/^[1-9]\d*$/.test(requested))notFound();
  const versionNumber=requested?Number(requested):details.currentVersionNumber??details.versionCount;
  const version=versions.find(v=>v.versionNumber===versionNumber);if(requested&&!version)notFound();
  const mime=version?.mimeType??null;const kind=mime==="application/pdf"?"pdf":isRenditionSupported(mime)?"office":mime&&["image/png","image/jpeg","image/webp","image/gif"].includes(mime)?"image":null;
  const content=documentContentUrl(id,false,versionNumber||undefined);
  const canDownload=user?.isAuthenticated&&(user.isBootstrapAdministrator||user.permissions.includes("documents.download"));
  const versionHref=(number:number)=>`/kesfet/${id}?${new URLSearchParams({back,version:String(number)})}`;
  return <><DiscoverySearch/><div className={styles.content}>
    <nav aria-label="İçerik yolu" className={styles.breadcrumb}><Link href={back}>Arşiv sonuçları</Link><ChevronRight size={14}/><span>Belge</span></nav>
    <header className={styles.detailHeading}><span className={styles.kicker}>DİJİTAL BELGE · {formatFileType(mime)}</span><h1>{details.title}</h1><div className={styles.detailLinks}><Link href={back}><ArrowLeft size={15}/>Sonuçlara dön</Link>{version&&canDownload&&<a href={documentContentUrl(id,true,versionNumber)}><Download size={15}/>Orijinalini indir</a>}<Link href={`/documents/${id}${version?`?version=${versionNumber}`:""}`}><ExternalLink size={15}/>Ayrıntılı belge ekranı</Link>{kind&&version&&<DocumentFullscreen documentId={id} title={details.title} version={versionNumber} kind={kind} contentUrl={content}/>}</div></header>
    {version?.cancelledAt&&<p className={styles.error}>Bu sürüm iptal edilmiştir: {version.cancellationReason}. Geçmiş kaydı olarak görüntüleniyor.</p>}
    <div className={styles.detailGrid}><section className={styles.viewer} aria-label="Belge önizlemesi">{kind==="pdf"?<iframe title={details.title} src={content}/>:kind==="image"?<img src={content} alt={details.title}/>:kind==="office"?<OfficePreview key={versionNumber} documentId={id} title={details.title} versionNumber={versionNumber} fill/>:<div className={styles.empty}><FileText size={50}/><h2>{version?"Bu dosya türü tarayıcıda önizlenemiyor":"Dosya henüz hazır değil"}</h2><p>{version?"İndirme yetkiniz varsa orijinal dosyayı açabilirsiniz.":"Belgenin yükleme veya işleme süreci devam ediyor olabilir."}</p></div>}</section>
      <aside className={styles.metadata}><h2>Belge bilgileri</h2><dl><div><dt>Kayıt tarihi</dt><dd>{formatSearchDate(details.createdAt)}</dd></div><div><dt>Yüklenme tarihi</dt><dd>{formatSearchDate(version?.createdAt)}</dd></div><div><dt>Durum</dt><dd>{documentStatusLabels[details.status]??details.status}</dd></div><div><dt>Dosya türü ve boyutu</dt><dd>{formatFileType(mime)}{version?` · ${(version.sizeBytes/1024).toLocaleString("tr-TR",{maximumFractionDigits:1})} KB`:""}</dd></div><div><dt>Görüntülenen sürüm</dt><dd>{version?`v${versionNumber}${versionNumber===details.currentVersionNumber?" · Güncel":""}`:"—"}</dd></div>{version?.reason&&<div><dt>Sürüm açıklaması</dt><dd>{version.reason}</dd></div>}<div><dt>Fiziksel konum</dt><dd>{foldersResult.error?"Fiziksel konum bilgisi alınamadı.":foldersResult.folders.length?foldersResult.folders.map(f=><p key={f.id}>{f.barcode} · {f.locationCode} · {f.locationName}</p>):"Fiziksel klasör bağlantısı yok."}</dd></div></dl>
        <div className={styles.versions}><h3>Sürüm geçmişi</h3>{versions.length?versions.map(v=><Link key={v.versionNumber} href={versionHref(v.versionNumber)} aria-current={v.versionNumber===versionNumber?"true":undefined}>v{v.versionNumber} · {formatSearchDate(v.createdAt)}{v.cancelledAt?" · İptal edildi":""}</Link>):<p>Henüz sürüm yok.</p>}</div>
      </aside>
    </div>
  </div></>;
}
