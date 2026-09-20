"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/api-client";
import type { MetadataSchemaDetail } from "@/features/classification/model/classification";

export type MetadataActionResult = { ok?: true; error?: string };

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function refresh() {
  revalidatePath("/tanimlamalar/ustveri");
}

export async function renameMetadataSchemaAction(schemaId: string, name: string): Promise<MetadataActionResult> {
  if (!name.trim()) return { error: "Şema adı zorunludur." };
  try {
    await apiPut(`/classification/metadata-schemas/${schemaId}`, { name: name.trim() });
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Şema adı güncellenemedi.") };
  }
}

export async function deleteMetadataSchemaAction(schemaId: string): Promise<MetadataActionResult> {
  try {
    await apiDelete(`/classification/metadata-schemas/${schemaId}`);
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Taslak şema silinemedi.") };
  }
}

export async function createMetadataSchemaAction(data: {
  key: string;
  name: string;
  version: number;
}): Promise<{ id?: string; error?: string }> {
  if (!data.key.trim()) return { error: "Şema anahtarı zorunludur." };
  if (!data.name.trim()) return { error: "Şema adı zorunludur." };
  if (!data.version || data.version <= 0) return { error: "Geçerli bir sürüm numarası giriniz." };

  try {
    const res = await apiPost<{ key: string; name: string; version: number }, { id: string }>(
      "/classification/metadata-schemas",
      {
        key: data.key.trim(),
        name: data.name.trim(),
        version: Number(data.version),
      },
    );
    refresh();
    return { id: res.id };
  } catch (error) {
    return { error: message(error, "Şema oluşturulamadı.") };
  }
}

export async function publishMetadataSchemaAction(schemaId: string): Promise<MetadataActionResult> {
  try {
    await apiPost(`/classification/metadata-schemas/${schemaId}/publish`, {});
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Şema yayımlanamadı.") };
  }
}

export async function revertMetadataSchemaToDraftAction(schemaId: string): Promise<MetadataActionResult> {
  try {
    await apiPost(`/classification/metadata-schemas/${schemaId}/revert-to-draft`, {});
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Şema taslağa geri alınamadı.") };
  }
}

export type MetadataFieldInput = {
  label: string;
  fieldType: string;
  isRequired: boolean;
  isSearchable: boolean;
  isRepeatable: boolean;
  optionsJson: string | null;
};

/**
 * Alan tanımını düzeltir.
 *
 * Alan anahtarı gönderilmez: belgelere kaydedilmiş üstveri değerleri bu
 * anahtarla saklanır; değiştirmek mevcut kayıtların değerlerini erişilemez
 * yapardı. Sunucu ayrıca yayımlanmış şemada değişikliği reddeder.
 */
export async function updateMetadataFieldAction(
  schemaId: string,
  fieldId: string,
  input: MetadataFieldInput,
): Promise<MetadataActionResult> {
  if (!input.label.trim()) return { error: "Görünen ad zorunludur." };
  try {
    await apiPut(`/classification/metadata-schemas/${schemaId}/fields/${fieldId}`, {
      ...input,
      label: input.label.trim(),
      optionsJson: input.optionsJson?.trim() || null,
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Alan güncellenemedi.") };
  }
}

export async function addMetadataFieldAction(
  schemaId: string,
  input: MetadataFieldInput & { key: string },
): Promise<MetadataActionResult> {
  if (!input.key.trim()) return { error: "Alan anahtarı zorunludur." };
  if (!input.label.trim()) return { error: "Görünen ad zorunludur." };
  try {
    await apiPost(`/classification/metadata-schemas/${schemaId}/fields`, {
      key: input.key.trim(),
      label: input.label.trim(),
      fieldType: input.fieldType,
      isRequired: input.isRequired,
      isSearchable: input.isSearchable,
      isRepeatable: input.isRepeatable,
      optionsJson: input.optionsJson?.trim() || null,
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Alan eklenemedi.") };
  }
}

export async function removeMetadataFieldAction(schemaId: string, fieldId: string): Promise<MetadataActionResult> {
  try {
    await apiDelete(`/classification/metadata-schemas/${schemaId}/fields/${fieldId}`);
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Alan kaldırılamadı.") };
  }
}

/**
 * Yayımlanmış şemadan yeni taslak sürüm açar.
 *
 * <para>
 * Yayımlanan şema değişmez: belgelerin üstverisine bağlıdır ve alanını
 * değiştirmek kaydedilmiş değerlerin anlamını sonradan kaydırırdı. Değişiklik
 * için yeni sürüm gerekir; eskiden bu, tüm alanların elle yeniden girilmesi
 * demekti. Alanlar buradan kopyalanır, yönetici yalnız değiştireceğini düzenler.
 * </para>
 */
export async function createSchemaVersionAction(
  sourceSchemaId: string,
): Promise<{ id?: string; error?: string }> {
  try {
    const source = await apiGet<MetadataSchemaDetail>(
      `/classification/metadata-schemas/${sourceSchemaId}`,
      { cache: "no-store" },
    );

    const created = await apiPost<{ key: string; name: string; version: number }, { id: string }>(
      "/classification/metadata-schemas",
      { key: source.key, name: source.name, version: source.version + 1 },
    );

    for (const field of source.fields) {
      await apiPost(`/classification/metadata-schemas/${created.id}/fields`, {
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        isSearchable: field.isSearchable,
        isRepeatable: field.isRepeatable,
        optionsJson: field.optionsJson,
      });
    }

    refresh();
    return { id: created.id };
  } catch (error) {
    return { error: message(error, "Yeni sürüm oluşturulamadı.") };
  }
}
