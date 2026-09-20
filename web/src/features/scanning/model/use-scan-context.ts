"use client";
import { useRef, useState } from "react";
import { loadScanContextAction } from "../api/scan-context-action";
import { classificationKey, emptyScanContext, type ScanContext } from "./scan-context";

export function useScanContext(initial: ScanContext, initialDossierId = "", initialFolderId = "") {
  const [context, setContext] = useState(initial);
  const [ownerUnitId, setOwnerUnitId] = useState(initial.ownerUnitId);
  const initialFolder = initial.folders.find(f => f.id === initialFolderId);
  const initialDossier = initial.dossiers.find(d => d.id === (initialDossierId || initialFolder?.digitalDossierId));
  const initialClassification = initialDossier ? classificationKey(initialDossier.filePlanId, initialDossier.filePlanItemId)
    : initial.classifications.find(c => c.code === initialFolder?.filePlanCode)?.key ?? "";
  const [dossierId, setDossierId] = useState(initialDossier?.id ?? "");
  const [folderId, setFolderId] = useState(initialFolder?.id ?? "");
  const [selectedClassification, setClassification] = useState(initialClassification);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const dossier = context.dossiers.find(d => d.id === dossierId);
  const classification = context.classifications.find(c => c.key === selectedClassification);

  async function changeUnit(id: string) {
    const request = ++generation.current;
    setOwnerUnitId(id); setContext(emptyScanContext(id)); setDossierId(""); setFolderId(""); setClassification(""); setError("");
    setLoading(!!id);
    if (!id) return;
    try {
      const result = await loadScanContextAction(id);
      if (request !== generation.current) return;
      if (result.error) setError(result.error);
      else if (result.context?.ownerUnitId === id) setContext(result.context);
      else setError("Birim kapsamı doğrulanamadı.");
    } catch { if (request === generation.current) setError("Birim dosyaları yüklenemedi. Lütfen yeniden deneyin."); }
    finally { if (request === generation.current) setLoading(false); }
  }
  async function refresh() {
    const request = ++generation.current;
    setLoading(true);
    try {
      const result = await loadScanContextAction(ownerUnitId);
      if (request !== generation.current) return;
      if (result.error) setError(result.error);
      else if (result.context?.ownerUnitId === ownerUnitId) { setContext(result.context); setError(""); }
    } catch { if (request === generation.current) setError("Birim dosyaları yenilenemedi."); }
    finally { if (request === generation.current) setLoading(false); }
  }
  function changeDossier(id: string) {
    const next = context.dossiers.find(d => d.id === id);
    setDossierId(next?.id ?? ""); setFolderId("");
    setClassification(next ? classificationKey(next.filePlanId, next.filePlanItemId) : "");
  }
  function changeFolder(id: string) {
    const next = context.folders.find(f => f.id === id);
    setFolderId(next?.id ?? "");
    if (!next) return;
    const linked = context.dossiers.find(d => d.id === next.digitalDossierId);
    if (linked) { setDossierId(linked.id); setClassification(classificationKey(linked.filePlanId, linked.filePlanItemId)); }
    else if (!dossier) setClassification(context.classifications.find(c => c.code === next.filePlanCode)?.key ?? "");
  }
  function changeClassification(key: string) { setClassification(key); setFolderId(""); }
  const folders = context.folders.filter(f => !dossier ||
    ((!f.digitalDossierId || f.digitalDossierId === dossier.id) && f.filePlanCode === dossier.filePlanCode));
  return { context, ownerUnitId, dossier, dossierId, folderId, classification, selectedClassification, folders,
    loading, error, refresh, changeUnit, changeDossier, changeFolder, changeClassification };
}
