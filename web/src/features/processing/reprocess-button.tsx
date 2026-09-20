"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reprocessDocument } from "./reprocess-action";
export function ReprocessButton({documentId,jobId}:{documentId:string;jobId:string}) {
  const [pending,start]=useTransition();const [error,setError]=useState("");const [done,setDone]=useState(false);const router=useRouter();
  return <div className="relative z-10 space-y-2"><Button size="sm" variant="outline" disabled={pending||done} onClick={()=>{setError("");start(async()=>{const result=await reprocessDocument(documentId,jobId);setError(result.error??"");if(!result.error){setDone(true);router.refresh();}});}}>{pending?"Başlatılıyor…":done?"Yeniden işleme kuyruğa alındı":"Yeniden işle"}</Button>{error&&<p role="alert" className="max-w-md text-sm text-destructive">{error}</p>}</div>;
}
