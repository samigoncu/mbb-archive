"use client";
import { useEffect, useState, useTransition } from "react";
import { ActionForm } from "@/components/action-form";
import { assignTaskAction, findTaskDocuments, getTaskAssignees } from "../api/assignment-actions";
import type { WorkflowWorkItem } from "../model/workflow";
const field = "mt-1.5 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";
export function TaskAssignmentForm({ item }: { item?:WorkflowWorkItem }) {
  const [documentId,setDocumentId] = useState(item?.documentId ?? "");
  const [search,setSearch] = useState("");
  const [documents,setDocuments] = useState<{id:string;title:string}[]>([]);
  const [candidates,setCandidates] = useState<{subjectId:string;unitName:string}[]>([]);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  const [pending,start] = useTransition();
  useEffect(() => {
    let active = true;
    setCandidates([]);setError("");setLoading(!!documentId);
    if (documentId) getTaskAssignees(documentId,item?.permission).then(result => {if(active){setCandidates(result.items);setError(result.error ?? "");setLoading(false);}});
    return () => {active=false;};
  },[documentId,item?.permission]);
  return <div className="space-y-4">
    {!item && <form className="flex items-end gap-2" onSubmit={event => {event.preventDefault();start(async()=>{const result=await findTaskDocuments(search);setDocuments(result.items);setError(result.error ?? "");});}}><label className="min-w-0 flex-1 text-sm">Görev için belge bul<input value={search} onChange={event=>setSearch(event.target.value)} className={field} placeholder="Belge başlığı" /></label><button disabled={pending} className="h-10 rounded-lg border px-4 text-sm">{pending?"Aranıyor…":"Belge ara"}</button></form>}
    <ActionForm action={assignTaskAction} label={item?"Atamayı kaydet":"Görevi oluştur ve ata"}>
      {item ? <><input type="hidden" name="instanceId" value={item.instanceId}/><input type="hidden" name="workItemId" value={item.id}/><input type="hidden" name="version" value={item.version}/></> : <>
        <label className="text-sm">İlgili belge<select className={field} name="documentId" required value={documentId} onChange={event=>setDocumentId(event.target.value)}><option value="">Arama sonuçlarından belge seçin</option>{documents.map(document=><option key={document.id} value={document.id}>{document.title}</option>)}</select></label>
        <label className="text-sm">Görev başlığı<input name="title" required maxLength={300} className={field} placeholder="Örn. Belge üstverisini kontrol edin" /></label>
        <label className="text-sm">Tamamlama süresi (dakika)<input name="slaMinutes" type="number" required min={1} max={525600} defaultValue={1440} className={field}/><span className="mt-1 block text-xs text-muted-foreground">Atama anından itibaren; 1440 dakika = 1 gün.</span></label>
      </>}
      <label className="text-sm">Atanacak personel<select name="subjectId" required disabled={loading || !candidates.length} className={field} key={`${documentId}:${candidates.map(c=>c.subjectId).join()}`} defaultValue=""><option value="">{loading?"Personel yükleniyor…":"Personel seçin"}</option>{candidates.map(candidate=><option key={candidate.subjectId} value={candidate.subjectId}>{candidate.subjectId} · {candidate.unitName}</option>)}</select></label>
      <p className="text-xs leading-5 text-muted-foreground">Yalnız belgenin sahibi olan birimdeki, görev okuma ve tamamlama yetkisi kayıtlı personel listelenir. Atama yetki vermez.</p>
      {documentId && !loading && !error && !candidates.length && <p role="status" className="text-sm">Bu birimde atanabilecek yetkili personel bulunamadı. Birim üyeliği ve görev izinlerini kontrol edin.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </ActionForm>
  </div>;
}
