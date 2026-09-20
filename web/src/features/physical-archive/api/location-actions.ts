"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPost, apiPut } from "@/lib/api/api-client";

export type LocationActionState = { status: "idle" | "success" | "error"; message?: string };

const failure = (error: unknown, fallback: string): LocationActionState => ({
  status: "error",
  message: error instanceof Error && error.message ? error.message : fallback,
});

/** Yerleşim hem bu ekranda hem dosya/taşıma seçicilerinde okunur. */
function refresh() {
  revalidatePath("/arsiv-yerlesimi");
  revalidatePath("/arsiv-simulatoru");
  revalidatePath("/dosya-islemleri");
}

function read(formData: FormData) {
  const capacity = String(formData.get("capacity") ?? "").trim();
  return {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    barcode: String(formData.get("barcode") ?? "").trim(),
    capacity: capacity ? Number(capacity) : null,
  };
}

export async function createLocationAction(
  _previous: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const { code, name, barcode, capacity } = read(formData);
  const parentId = String(formData.get("parentId") ?? "").trim();
  const typeCode = String(formData.get("typeCode") ?? "").trim();

  if (!code || !name || !barcode) return { status: "error", message: "Kod, ad ve barkod zorunludur." };
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1))
    return { status: "error", message: "Kapasite birden büyük bir tam sayı olmalıdır." };

  try {
    if (parentId) {
      await apiPost(`/physical-archive/locations/${encodeURIComponent(parentId)}/children`,
        { typeCode, code, name, barcode, capacity });
    } else {
      // Kök konumda kapasite tutulmaz; seviye katalogdan seçilir.
      await apiPost("/physical-archive/locations/root", { code, name, barcode, typeCode });
    }
    refresh();
    return { status: "success", message: "Konum eklendi." };
  } catch (error) {
    return failure(error, "Konum eklenemedi.");
  }
}

export async function updateLocationAction(
  _previous: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const { code, name, barcode, capacity } = read(formData);

  if (!id) return { status: "error", message: "Konum bulunamadı." };
  if (!code || !name || !barcode) return { status: "error", message: "Kod, ad ve barkod zorunludur." };
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1))
    return { status: "error", message: "Kapasite birden büyük bir tam sayı olmalıdır." };

  try {
    await apiPut(`/physical-archive/locations/${encodeURIComponent(id)}`, { code, name, barcode, capacity });
    refresh();
    return { status: "success", message: "Konum güncellendi." };
  } catch (error) {
    return failure(error, "Konum güncellenemedi.");
  }
}

export async function setLocationActiveAction(id: string, isActive: boolean): Promise<LocationActionState> {
  try {
    await apiPost(`/physical-archive/locations/${encodeURIComponent(id)}/active`, { isActive });
    refresh();
    return { status: "success", message: isActive ? "Konum yeniden kullanıma açıldı." : "Konum pasife alındı." };
  } catch (error) {
    return failure(error, "Konum durumu değiştirilemedi.");
  }
}

/**
 * Silme geri alınamaz. Altında konum ya da içinde dosya varsa sunucu reddeder;
 * mesajı olduğu gibi kullanıcıya taşırız.
 */
export async function deleteLocationAction(id: string): Promise<LocationActionState> {
  try {
    await apiDelete(`/physical-archive/locations/${encodeURIComponent(id)}`);
    refresh();
    return { status: "success", message: "Konum silindi." };
  } catch (error) {
    return failure(error, "Konum silinemedi.");
  }
}
