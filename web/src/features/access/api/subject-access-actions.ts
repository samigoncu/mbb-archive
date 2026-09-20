"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/api-client";
import type { ManagedSubject } from "@/features/access/model/administration";

export type SubjectUnitMembership = {
  id: string;
  subjectId: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  isPrimary: boolean;
  /** "manual" ya da dizin eşitlemesi; dizinden gelen üyelik elle kaldırılmamalı. */
  source: string;
  createdAt: string;
};

export type SubjectAccess = {
  subject: ManagedSubject | null;
  memberships: SubjectUnitMembership[];
  error?: string;
};

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function refresh() {
  revalidatePath("/tanimlamalar/yetkiler");
}

/** Bir kullanıcının rolleri ve birim üyelikleri tek çağrıda okunur. */
export async function loadSubjectAccessAction(subjectId: string): Promise<SubjectAccess> {
  try {
    const [subject, memberships] = await Promise.all([
      apiGet<ManagedSubject>(`/access/subjects/${encodeURIComponent(subjectId)}/roles`, { cache: "no-store" }),
      apiGet<SubjectUnitMembership[]>(`/organization/subjects/${encodeURIComponent(subjectId)}/memberships`, { cache: "no-store" }),
    ]);
    return { subject, memberships };
  } catch (error) {
    return { subject: null, memberships: [], error: message(error, "Kullanıcı bilgileri okunamadı.") };
  }
}

export type SaveSubjectAccess = {
  subjectId: string;
  version: string;
  roleIds: string[];
  unitIds: string[];
  primaryUnitId: string | null;
};

/**
 * Rol ve birim atamalarını birlikte kaydeder.
 *
 * <para>
 * Roller tek çağrıda toplu yazılır (sürüm kontrolüyle). Birim üyelikleri için
 * toplu uç yok; mevcut durumla istenen durum karşılaştırılıp yalnız fark
 * uygulanır — böylece dokunulmayan üyeliğin kaydı ve kaynağı korunur.
 * </para>
 */
export async function saveSubjectAccessAction(input: SaveSubjectAccess): Promise<SubjectAccess> {
  try {
    await apiPut(`/access/subjects/${encodeURIComponent(input.subjectId)}/roles`, {
      roleIds: input.roleIds,
      expectedVersion: input.version,
    });
  } catch (error) {
    return { subject: null, memberships: [], error: message(error, "Rol atamaları kaydedilemedi.") };
  }

  try {
    const current = await apiGet<SubjectUnitMembership[]>(
      `/organization/subjects/${encodeURIComponent(input.subjectId)}/memberships`,
      { cache: "no-store" },
    );
    const desired = new Set(input.unitIds);
    const existing = new Map(current.map(item => [item.unitId, item]));

    for (const unitId of desired) {
      const membership = existing.get(unitId);
      const shouldBePrimary = input.primaryUnitId === unitId;
      if (membership && membership.isPrimary === shouldBePrimary) continue;
      // Birincil işareti değiştiğinde de aynı uç kullanılır; kayıt güncellenir.
      await apiPost("/organization/memberships", {
        subjectId: input.subjectId,
        unitId,
        isPrimary: shouldBePrimary,
      });
    }

    for (const membership of current) {
      if (desired.has(membership.unitId)) continue;
      await apiDelete(
        `/organization/subjects/${encodeURIComponent(input.subjectId)}/memberships/${membership.unitId}`,
      );
    }
  } catch (error) {
    return { subject: null, memberships: [], error: message(error, "Birim üyelikleri kaydedilemedi. Rol atamaları kaydedildi.") };
  }

  refresh();
  return loadSubjectAccessAction(input.subjectId);
}
