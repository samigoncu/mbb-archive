"use server";
import { ApiError } from "@/lib/api/api-error";
import { getScanContext } from "./get-scan-context";
import type { ScanContextResult } from "../model/scan-context";
export async function loadScanContextAction(ownerUnitId: string): Promise<ScanContextResult> {
  try { return { context: await getScanContext(ownerUnitId) }; }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Birim dosyaları yüklenemedi. Lütfen yeniden deneyin." }; }
}
