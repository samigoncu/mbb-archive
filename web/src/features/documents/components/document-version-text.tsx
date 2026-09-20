"use client";
import { useEffect,useState,useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getDocumentVersionText } from "../api/version-text-action";
import type { DocumentText } from "../api/get-document-text";
export function DocumentVersionText({documentId,version}:{documentId:string;version:number}) {
 const [data,setData]=useState<DocumentText|null>(null);const [error,setError]=useState("");const [pending,start]=useTransition();const [revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;start(async()=>{const result=await getDocumentVersionText(documentId,version);if(active){setData(result.data??null);setError(result.error??"");}});return()=>{active=false;};},[documentId,version,revision]);
 return <div className="space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">v{version} OCR / metin çıktısı</h3><Button size="sm" variant="outline" disabled={pending} onClick={()=>setRevision(v=>v+1)}>Yenile</Button></div>{pending&&<p role="status" className="text-sm">Metin yükleniyor…</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{!pending&&data&&!data.hasText&&<p className="text-sm text-muted-foreground">Bu sürüm için kaydedilmiş OCR veya metin çıktısı yok.</p>}{data?.hasText&&<><p className="text-xs text-muted-foreground">{data.characterCount.toLocaleString("tr-TR")} karakter{data.isTruncated?" (görüntüleme sınırında kırpıldı)":""}</p><pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed">{data.text}</pre></>}</div>;
}
