"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDocumentWorkflowHistory, type DocumentWorkflowItem } from "../api/document-history";
import type { PagedResult } from "@/features/documents/model/document";
const date=(value:string|null)=>value ? new Date(value).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"}) : "—";
export function DocumentWorkflowHistory({documentId}:{documentId:string}) {
  const [data,setData]=useState<PagedResult<DocumentWorkflowItem>|null>(null);
  const [error,setError]=useState(""); const [page,setPage]=useState(1); const [revision,setRevision]=useState(0); const [pending,start]=useTransition();
  useEffect(()=>{let active=true;start(async()=>{const result=await getDocumentWorkflowHistory(documentId,page);if(active){setData(result.data??null);setError(result.error??"");}});return()=>{active=false;};},[documentId,page,revision]);
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Görev ve onay geçmişi</h3><Button variant="outline" size="sm" disabled={pending} onClick={()=>setRevision(v=>v+1)}>Yenile</Button></div>
    <p className="text-sm text-muted-foreground">Açık ve tamamlanan adımlar, son atama ve sonuç bilgileri. Görev işlemleri için <Link href="/gorevlerim" className="text-primary underline">Görevlerim</Link> ekranını kullanın.</p>
    {pending && <p role="status">Geçmiş yükleniyor…</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!pending && data?.totalCount===0 && <p className="text-sm text-muted-foreground">Bu belge için kayıtlı görev yok.</p>}
    <ol className="space-y-3">{data?.items.map(item=><li key={item.id} className="space-y-2 rounded-lg border border-border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{item.nodeName}</strong><span>{item.status==="Completed" ? "Tamamlandı" : item.status==="Escalated" ? "Üst kademeye iletildi" : "Açık"}</span></div><p className="text-muted-foreground">{item.definitionName} · {date(item.createdAt)}</p><dl className="space-y-1"><div><dt className="inline text-muted-foreground">Atanan: </dt><dd className="inline">{item.assigneeSubjectId??"Atama bekliyor"}</dd></div>{item.assignedBy && <div><dt className="inline text-muted-foreground">Son atayan: </dt><dd className="inline">{item.assignedBy} · {date(item.assignedAt)}</dd></div>}<div><dt className="inline text-muted-foreground">Son tarih: </dt><dd className="inline">{date(item.dueAt)}</dd></div>{item.completedAt && <div><dt className="inline text-muted-foreground">Tamamlayan ve sonuç: </dt><dd className="inline">{item.completedBy} · {date(item.completedAt)} · {item.outcome==="completed" ? "Tamamlandı" : item.outcome}</dd></div>}</dl></li>)}</ol>
    {data && data.totalCount>data.pageSize && <nav aria-label="İş akışı geçmişi sayfaları" className="flex items-center justify-between gap-2"><Button variant="outline" disabled={pending||page<=1} onClick={()=>setPage(v=>v-1)}>Önceki</Button><span className="text-sm">{page} / {Math.ceil(data.totalCount/data.pageSize)}</span><Button variant="outline" disabled={pending||page*data.pageSize>=data.totalCount} onClick={()=>setPage(v=>v+1)}>Sonraki</Button></nav>}
  </div>;
}
