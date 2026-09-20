"use server";
import { updateTag } from "next/cache";
import { apiDelete, apiGet, apiPut } from "@/lib/api/api-client";
import type { Branding, BrandingAssetKind } from "../model/branding";

export type BrandingResult = { data?: Branding; error?: string };

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/**
 * Marka tüm sayfaların düzeninde okunuyor; kaydeden yönetici değişikliği
 * anında görmeli. `updateTag` bayat içerik sunmadan etiketi düşürür ve yalnız
 * sunucu eyleminden çağrılabilir.
 */
function refresh() {
  updateTag("branding");
}

export async function loadBrandingAction(): Promise<BrandingResult> {
  try {
    return { data: await apiGet<Branding>("/operations/branding", { cache: "no-store" }) };
  } catch (error) {
    return { error: message(error, "Kurum kimliği okunamadı.") };
  }
}

export async function saveBrandingAction(input: {
  siteTitle: string;
  institutionName: string;
  description: string;
  departmentName?: string | null;
  logoUrl: string;
  faviconUrl: string;
  loginImageUrl: string;
  expectedVersion: number;
}): Promise<BrandingResult> {
  try {
    const data = await apiPut<typeof input, Branding>("/operations/branding", input);
    refresh();
    return { data };
  } catch (error) {
    return { error: message(error, "Kurum kimliği kaydedilemedi.") };
  }
}

/** Dosya API'ye base64 olarak taşınır; tarayıcıdan API'ye doğrudan istek atılmaz. */
export async function uploadBrandingAssetAction(
  kind: BrandingAssetKind,
  formData: FormData,
): Promise<BrandingResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Bir dosya seçin." };
  if (file.size > 1024 * 1024) return { error: "Görsel en fazla 1024 KB olabilir." };

  try {
    const data = await apiPut<{ fileName: string; contentType: string; contentBase64: string }, Branding>(
      `/operations/branding/assets/${kind}`,
      {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        contentBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      },
    );
    refresh();
    return { data };
  } catch (error) {
    return { error: message(error, "Görsel yüklenemedi.") };
  }
}

export async function removeBrandingAssetAction(kind: BrandingAssetKind): Promise<BrandingResult> {
  try {
    const data = await apiDelete<Branding>(`/operations/branding/assets/${kind}`);
    refresh();
    return { data };
  } catch (error) {
    return { error: message(error, "Görsel kaldırılamadı.") };
  }
}
