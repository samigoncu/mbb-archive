"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiPost } from "@/lib/api/api-client";

export type ProcessActionState = { status: "idle" | "success" | "error"; message?: string; id?: string };
const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (error: unknown): ProcessActionState => ({ status: "error", message: error instanceof ApiError ? error.message : "İşlem tamamlanamadı. Tekrar deneyin." });
function refresh() { revalidatePath("/devir-imha", "layout"); }

export async function createDispositionAction(_previous: ProcessActionState, data: FormData): Promise<ProcessActionState> {
  const requestId = field(data, "requestId"), retentionCaseId = field(data, "retentionCaseId");
  const action = field(data, "action"), reason = field(data, "reason"), commissionReference = field(data, "commissionReference");
  if (!guid.test(requestId) || !guid.test(retentionCaseId) || !["Transfer", "Destroy", "KeepPermanent"].includes(action)
    || !reason || reason.length > 2000 || !commissionReference || commissionReference.length > 300)
    return { status: "error", message: "Karar, gerekçe ve komisyon görevlendirme referansını kontrol edin." };
  try {
    const result = await apiPost<object, { id: string }>("/retention/dispositions/", { requestId, retentionCaseId, action, reason, commissionReference });
    refresh();
    return { status: "success", message: "Değerlendirme taslağı oluşturuldu.", id: result.id };
  } catch (error) { return fail(error); }
}

export async function advanceDispositionAction(_previous: ProcessActionState, data: FormData): Promise<ProcessActionState> {
  const id = field(data, "id"), operation = field(data, "operation");
  const expectedVersion = Number(field(data, "version"));
  if (!guid.test(id) || !["submit", "reviews", "approve", "accept-transfer", "keep-permanently", "execute-destruction"].includes(operation)
    || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1)
    return { status: "error", message: "İşlem bilgisi geçersiz. Sayfayı yenileyin." };
  try {
    await apiPost<object, void>(`/retention/dispositions/${id}/${operation}`, {
      expectedVersion, reason: field(data, "reason"), approved: field(data, "decision") === "approve",
      reference: field(data, "reference"), receivingArchive: field(data, "receivingArchive"),
      evidenceDocumentId: field(data, "evidenceDocumentId") || null, evidenceVersionId: field(data, "evidenceVersionId") || null,
      method: field(data, "method"), location: field(data, "location"), witnesses: field(data, "witnesses"),
      executedAt: field(data, "executedAt") ? new Date(field(data, "executedAt")).toISOString() : null,
    });
    refresh(); return { status: "success", message: "İşlem kaydedildi." };
  } catch (error) { return fail(error); }
}

export async function changeHoldAction(_previous: ProcessActionState, data: FormData): Promise<ProcessActionState> {
  const id = field(data, "caseId"), holdId = field(data, "holdId"), reason = field(data, "reason");
  if (!guid.test(id) || (holdId && !guid.test(holdId)) || !reason || reason.length > 2000)
    return { status: "error", message: "Dosya bilgisi ve gerekçe geçerli olmalıdır." };
  try {
    const path = `/retention/cases/${id}/legal-holds${holdId ? `/${holdId}/release` : ""}`;
    await apiPost<object, unknown>(path, { reason });
    refresh(); return { status: "success", message: holdId ? "Seçili bloke kaldırıldı." : "Hukuki bloke kaydedildi." };
  } catch (error) { return fail(error); }
}

export async function createRuleAction(_previous: ProcessActionState, data: FormData): Promise<ProcessActionState> {
  const code = field(data, "code"), name = field(data, "name"), action = field(data, "action");
  const retentionMonths = Number(field(data, "retentionMonths"));
  if (!code || code.length > 100 || !name || name.length > 300 || !Number.isInteger(retentionMonths)
    || retentionMonths < 0 || retentionMonths > 1200 || !["Review", "Destroy", "Transfer", "KeepPermanent"].includes(action))
    return { status: "error", message: "Kod, ad, süre ve saklama kararını kontrol edin." };
  try {
    await apiPost<object, { id: string }>("/retention/rules", { code, name, retentionMonths, action });
    refresh(); revalidatePath("/kayit-beyani");
    return { status: "success", message: "Saklama kuralı kaydedildi." };
  } catch (error) { return fail(error); }
}


export async function configureCommissionAction(_previous: ProcessActionState, data: FormData): Promise<ProcessActionState> {
  const id = field(data, "id"), expectedVersion = Number(field(data, "version"));
  const members = field(data, "members").split(/[\n,;]/).map(value => value.trim()).filter(Boolean);
  const from = new Date(field(data, "validFrom")), until = new Date(field(data, "validUntil"));
  if (!guid.test(id) || !Number.isSafeInteger(expectedVersion) || members.length < 2 || members.length > 20
    || members.some(member => member.length > 300) || !Number.isFinite(from.getTime()) || !Number.isFinite(until.getTime()))
    return { status: "error", message: "Üye kimliklerini ve komisyon görev tarihlerini kontrol edin." };
  try {
    await apiPost<object, void>(`/retention/dispositions/${id}/commission`, { expectedVersion, members, validFrom: from.toISOString(), validUntil: until.toISOString() });
    refresh(); return { status: "success", message: "Komisyon üyeleri ve görev süresi kaydedildi." };
  } catch (error) { return fail(error); }
}

export async function delegateCommissionAction(_previous: ProcessActionState, data: FormData): Promise<ProcessActionState> {
  const id = field(data, "id"), expectedVersion = Number(field(data, "version"));
  const member = field(data, "member"), delegate = field(data, "delegate"), reference = field(data, "reference");
  const from = new Date(field(data, "validFrom")), until = new Date(field(data, "validUntil"));
  if (!guid.test(id) || !Number.isSafeInteger(expectedVersion) || !member || !delegate || !reference
    || !Number.isFinite(from.getTime()) || !Number.isFinite(until.getTime()))
    return { status: "error", message: "Asıl üye, vekil, görevlendirme referansı ve tarihleri kontrol edin." };
  try {
    await apiPost<object, void>(`/retention/dispositions/${id}/commission/delegate`, { expectedVersion, member, delegate, reference, validFrom: from.toISOString(), validUntil: until.toISOString() });
    refresh(); return { status: "success", message: "Süreli vekâlet kaydedildi." };
  } catch (error) { return fail(error); }
}

export async function createTransferPackageAction(_previous: ProcessActionState, data: FormData): Promise<ProcessActionState> {
  const id = field(data, "id"), expectedVersion = Number(field(data, "version"));
  if (!guid.test(id) || !Number.isSafeInteger(expectedVersion)) return { status: "error", message: "İşlem bilgisi geçersiz." };
  try {
    await apiPost<object, object>(`/retention/dispositions/${id}/package`, { expectedVersion });
    refresh(); return { status: "success", message: "Tüm dijital sürümler doğrulanarak devir paketi hazırlandı." };
  } catch (error) { return fail(error); }
}
