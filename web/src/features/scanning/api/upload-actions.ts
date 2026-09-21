"use server";

import { isOfficeFile } from "@/features/documents/model/office-formats";

import { getScanContext } from "./get-scan-context";
import { validateScanSelection } from "../model/scan-context";
import { revalidatePath } from "next/cache";
import {
  ApiError,
  apiPost,
  apiPut,
  getServerApiBaseUrl,
  authorizationHeader,
} from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

import { getUploadPolicy } from "@/features/settings/api/upload-policy";
import { maxUploadBytes, uploadSizeError } from "../model/upload-size";

export type StageResponse = {
  ingestionId: string;
  documentId: string;
  status: string;
  sha256Hash: string;
  sizeBytes: number;
};

export type UploadScanResult = {
  success: boolean;
  message: string;
  documentId?: string;
  /** Belge kaydedildi ama klasör bağlama / sınıflandırma tamamlanamadı. */
  warnings?: string[];
};

/**
 * Belge kaydı oluşturur ve dosyayı hazırlık alanına yükler. Sonrasını
 * boru hattı devralır: güvenlik taraması → arşive alma → OCR → indeksleme.
 */
export async function uploadDocumentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();

  if (!file || typeof file === "string" || file.size === 0) {
    return { status: "error", message: "Bir dosya seçmelisiniz." };
  }

  if (file.size > maxUploadBytes) {
    return { status: "error", message: "Dosya boyutu 200 MB sınırını aşıyor." };
  }

  try {
    const document = await apiPost<{ title: string; ownerUnitId: string | null; dossierId: string | null }, { id: string }>("/documents", {
      ownerUnitId: String(formData.get("ownerUnitId") || "") || null,
      dossierId: String(formData.get("dossierId") || "") || null,
      title: title || file.name,
    });

    const staged = await stageFile(document.id, file);

    revalidatePath("/islem-takibi");
    revalidatePath("/tarama");
    revalidatePath("/documents");

    return {
      status: "success",
      message: `${file.name} yüklendi (${formatBytes(staged.sizeBytes)}). Güvenlik taraması kuyruğa alındı.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ApiError ? error.message : "Yükleme tamamlanamadı.",
    };
  }
}

/**
 * Tarama stüdyosundan gelen sayfaları tek bir belge olarak sisteme alır:
 * belge kaydı açılır, her sayfa hazırlık alanına yüklenir, istenirse fiziksel
 * klasöre bağlanır ve dosya planına göre sınıflandırılır. Bağlama ve
 * sınıflandırma hataları yutulmaz; uyarı olarak geri döner.
 */
export async function uploadScannedDocumentAction(formData: FormData): Promise<UploadScanResult> {
  const files = formData.getAll("files").filter((entry): entry is File => typeof entry !== "string" && entry.size > 0);
  const prepared = await prepareScannedDocumentAction(formData, files.map(file => ({ name: file.name, type: file.type, size: file.size })));
  if (!prepared.success || !prepared.documentId) return prepared;
  try { for (const file of files) await stageFile(prepared.documentId, file); }
  catch (error) { return { success: false, documentId: prepared.documentId, message: toMessage(error, "Dosya yüklenemedi; belge kaydı eksik kaldı.") }; }
  return completeScannedDocumentAction(prepared.documentId, formData);
}

export async function prepareScannedDocumentAction(
  formData: FormData,
  files: { name: string; type: string; size: number }[],
): Promise<UploadScanResult> {
  const title = String(formData.get("title") ?? "").trim();
  const folderId = String(formData.get("folderId") ?? "").trim();
  const filePlanId = String(formData.get("filePlanId") ?? "").trim();
  const filePlanItemId = String(formData.get("filePlanItemId") ?? "").trim();
  const metadataSchemaId = String(formData.get("metadataSchemaId") ?? "").trim();
  const metadataValues = readMetadataValues(formData);

  if (files.length === 0) {
    return { success: false, message: "En az bir dosya gereklidir." };
  }

  if (!title) {
    return { success: false, message: "Evrak konusu zorunludur." };
  }

  let limit: number;
  try { limit = (await getUploadPolicy()).maxUploadBytes; }
  catch { return { success: false, message: "Yükleme sınırı alınamadı. Yeniden deneyin." }; }
  if (files.some(file => !Number.isSafeInteger(file.size) || file.size <= 0)) return { success: false, message: "Dosya boyutu geçersiz." };
  const sizeError = uploadSizeError(files, limit);
  if (sizeError) return { success: false, message: sizeError };

  const oversized = files.find((file) => file.size > limit);
  if (files.length > 1 && files.some(isOfficeFile)) {
    return { success: false, message: "Office belgelerini ayrı kayıtlar olarak tek tek yükleyin. Her belge için kendi PDF kopyası oluşturulur." };
  }
  if (oversized) {
    return {
      success: false,
      message: `'${oversized.name}' yükleme sınırını aşıyor.`,
    };
  }

  // Re-check membership and every submitted option before creating any document.
  try {
    const ownerUnitId = String(formData.get("ownerUnitId") || "");
    if (!ownerUnitId) return { success: false, message: "Sahip birim seçilmelidir." };
    const context = await getScanContext(ownerUnitId, false);
    const invalid = validateScanSelection(context, { folderId, dossierId: String(formData.get("dossierId") || ""), filePlanId, filePlanItemId });
    if (invalid) return { success: false, message: invalid };
  } catch (error) { return { success: false, message: toMessage(error, "Birim ve dosya kapsamı doğrulanamadı.") }; }

  let documentId: string;

  try {
    const document = await apiPost<{ title: string; ownerUnitId: string | null; dossierId: string | null }, { id: string }>("/documents", {
      ownerUnitId: String(formData.get("ownerUnitId") || "") || null,
      dossierId: String(formData.get("dossierId") || "") || null,
      title,
    });
    documentId = document.id;
  } catch (error) {
    return { success: false, message: toMessage(error, "Belge kaydı oluşturulamadı.") };
  }

  return { success: true, documentId, message: "Belge kaydı oluşturuldu." };
}

export async function completeScannedDocumentAction(documentId: string, formData: FormData): Promise<UploadScanResult> {
  const title = String(formData.get("title") ?? "").trim();
  const folderId = String(formData.get("folderId") ?? "").trim();
  const filePlanId = String(formData.get("filePlanId") ?? "").trim();
  const filePlanItemId = String(formData.get("filePlanItemId") ?? "").trim();
  const metadataSchemaId = String(formData.get("metadataSchemaId") ?? "").trim();
  const metadataValues = readMetadataValues(formData);

  const warnings: string[] = [];

  if (folderId) {
    try {
      await apiPost(`/physical-archive/folders/${folderId}/documents`, {
        documentId,
      });
    } catch (error) {
      warnings.push(toMessage(error, "Arşiv klasörüne bağlanamadı."));
    }
  }

  if (filePlanId && filePlanItemId) {
    try {
      await apiPost(`/classification/documents/${documentId}/classifications`, {
        filePlanId,
        filePlanItemId,
        isPrimary: true,
      });
    } catch (error) {
      warnings.push(toMessage(error, "Dosya planına göre sınıflandırılamadı."));
    }
  }

  if (metadataSchemaId && metadataValues !== null) {
    try {
      await apiPut(
        `/classification/documents/${documentId}/metadata/${metadataSchemaId}`,
        metadataValues,
      );
    } catch (error) {
      warnings.push(toMessage(error, "Evrak üstverisi kaydedilemedi."));
    }

    try {
      await linkMetadataGeoRelation(documentId, title, metadataValues);
    } catch {
      // Coğrafi varlık bağlantısı başarısız olsa bile evrak akışı kesilmez
      warnings.push("Coğrafi harita konumu otomatik bağlanamadı; belge detayından bağlayabilirsiniz.");
    }
  }

  revalidatePath("/islem-takibi");
  revalidatePath("/tarama");
  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/harita");

  return {
    success: true,
    documentId,
    warnings,
    message: "Dosyalar güvenlik taraması kuyruğuna alındı.",
  };
}

function toMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Üstveri değerleri istemcide şemaya göre tiplenip JSON olarak taşınır; burada
 * yalnız çözümlenir. Biçim bozuksa üstveri gönderilmez, yükleme sürer.
 */
function readMetadataValues(
  formData: FormData,
): Record<string, unknown> | null {
  const raw = String(formData.get("metadataValues") ?? "").trim();

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function stageFile(
  documentId: string,
  file: File,
  reason?: string,
): Promise<StageResponse> {
  const response = await fetch(
    `${getServerApiBaseUrl()}/documents/${documentId}/files`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(await authorizationHeader()),
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        ...(reason?.trim()
          ? { "X-Version-Reason": encodeURIComponent(reason.trim()) }
          : {}),
      },
      body: await file.arrayBuffer(),
    },
  );

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new ApiError(
      problem.detail ?? `Dosya yüklenemedi (${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as StageResponse;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function linkMetadataGeoRelation(
  documentId: string,
  documentTitle: string,
  metadataValues: Record<string, unknown>,
) {
  let validFrom: string | null = null;
  let validTo: string | null = null;
  let targetGeoEntityId: string | null = null;
  let customGeoJson: string | null = null;
  let geometryName: string | null = null;

  for (const [key, rawVal] of Object.entries(metadataValues)) {
    const lowerKey = key.toLowerCase();

    // Tarih alanlarını tespit et
    if (typeof rawVal === "string") {
      const trimmed = rawVal.trim();
      if ((lowerKey.includes("baslangic") || lowerKey.includes("start")) && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        try { validFrom = new Date(trimmed).toISOString(); } catch { }
      }
      if ((lowerKey.includes("bitis") || lowerKey.includes("end")) && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        try { validTo = new Date(trimmed).toISOString(); } catch { }
      }
    }

    // Coğrafi değeri çözümle
    let geoObj: Record<string, unknown> | null = null;
    if (typeof rawVal === "object" && rawVal !== null) {
      geoObj = rawVal as Record<string, unknown>;
    } else if (typeof rawVal === "string" && rawVal.trim().startsWith("{")) {
      try {
        geoObj = JSON.parse(rawVal);
      } catch { }
    }

    if (geoObj) {
      // 1. CBS Varlık Referansı
      if (typeof geoObj.entityId === "string" && geoObj.entityId) {
        targetGeoEntityId = geoObj.entityId;
        continue;
      }

      // 2. GeoJSON Nesnesi (Polygon, LineString, Point)
      if (typeof geoObj.type === "string" && geoObj.coordinates) {
        customGeoJson = JSON.stringify(geoObj);
        geometryName = `${documentTitle || "Evrak"} (${geoObj.type})`;
        continue;
      }
    }

    // 3. Klasik "lat, lng" koordinat metni
    if (typeof rawVal === "string") {
      const parts = rawVal.split(",").map((p) => Number(p.trim()));
      if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        const [lat, lng] = parts;
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          customGeoJson = JSON.stringify({
            type: "Point",
            coordinates: [lng, lat],
          });
          geometryName = documentTitle || `Konum (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }
      }
    }
  }

  // Eğer yeni bir yerel geometri oluşturulacaksa
  if (!targetGeoEntityId && customGeoJson) {
    const entityResult = await apiPost<
      {
        provider: string;
        layerName: string;
        entityType: string;
        name: string;
        geoJson: string;
        propertiesJson?: string | null;
      },
      { id: string }
    >("/geo/entities", {
      provider: "local",
      layerName: "local",
      entityType: "CustomGeometry",
      name: geometryName || documentTitle || "Coğrafi Konum",
      geoJson: customGeoJson,
    });

    if (entityResult?.id) {
      targetGeoEntityId = entityResult.id;
    }
  }

  // CBS Varlığı ile belgeyi ilişkilendir
  if (targetGeoEntityId) {
    await apiPost<
      {
        geoEntityId: string;
        relationType: string;
        validFrom: string | null;
        validTo: string | null;
      },
      { id: string }
    >(`/geo/documents/${documentId}/relations`, {
      geoEntityId: targetGeoEntityId,
      relationType: "Subject",
      validFrom,
      validTo,
    });
  }
}
