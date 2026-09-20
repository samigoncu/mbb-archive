"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiDelete, apiPost } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

/**
 * Paylaşım verme ve kaldırma. Yetki kararı sunucuda verilir; buradaki form
 * yalnız isteği taşır (§21).
 */
export async function grantAction(
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  const value = (key: string) => String(data.get(key) ?? "").trim();

  try {
    switch (value("operation")) {
      case "create": {
        const resourceKey = value("resourceKey");

        if (!resourceKey) {
          return { status: "error", message: "Kaynak anahtarı gerekli." };
        }

        await apiPost("/access/grants/", {
          resourceType: value("resourceType"),
          resourceKey,
          subjectType: value("subjectType"),
          subjectKey: value("subjectKey"),
          permission: value("permission"),
          validFrom: null,
          // Süresiz paylaşım unutulur; bitiş tarihi verilirse kapsamdan
          // kendiliğinden düşer.
          validTo: value("validTo") ? new Date(value("validTo")).toISOString() : null,
          reason: value("reason") || null,
        });

        break;
      }

      case "revoke":
        await apiDelete(`/access/grants/${encodeURIComponent(value("id"))}`);
        break;

      default:
        return { status: "error", message: "Bilinmeyen paylaşım işlemi." };
    }

    revalidatePath("/tanimlamalar/paylasimlar");
    revalidatePath("/tanimlamalar/gorunurluk");

    return {
      status: "success",
      message:
        value("operation") === "revoke"
          ? "Paylaşım kaldırıldı. Kayıt silinmez, kapalı olarak saklanır."
          : "Paylaşım verildi.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError ? error.message : "Paylaşım işlemi tamamlanamadı.",
    };
  }
}
