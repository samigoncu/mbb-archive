"use server";
import { revalidatePath } from "next/cache";
import { apiDelete, apiPost, apiPut, ApiError } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
export async function definitionAction(
  _previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  const value = (key: string) => String(data.get(key) ?? "").trim();
  const id = encodeURIComponent(value("id"));
  try {
    switch (value("operation")) {
      case "unit-create":
        await apiPost("/organization/units", {
          code: value("code"),
          name: value("name"),
          shortName: value("shortName") || null,
          parentId: value("parentId") || null,
          externalReference: null,
          // Teşkilat seviyesi isteğe bağlıdır; boş bırakılan birim seviyesiz açılır.
          typeCode: value("typeCode") || null,
        });
        break;
      case "unit-rename":
        await apiPut(`/organization/units/${id}`, {
          name: value("name"),
          shortName: value("shortName") || null,
        });
        break;
      case "unit-active":
        await apiPost(`/organization/units/${id}/active`, {
          isActive: value("isActive") === "true",
        });
        break;
      case "schema-create":
        await apiPost("/classification/metadata-schemas", {
          key: value("key"),
          name: value("name"),
          version: Number(value("version")),
        });
        break;
      case "schema-field":
        await apiPost(`/classification/metadata-schemas/${id}/fields`, {
          key: value("key"),
          label: value("label"),
          fieldType: value("fieldType"),
          isRequired: value("isRequired") === "on",
          isSearchable: value("isSearchable") === "on",
          isRepeatable: false,
          optionsJson: value("optionsJson") || null,
        });
        break;
      case "schema-publish":
        await apiPost(`/classification/metadata-schemas/${id}/publish`, {});
        break;
      case "schema-delete":
        await apiDelete(`/classification/metadata-schemas/${id}`);
        break;
      case "role-create":
        await apiPost("/access/roles", {
          code: value("code"),
          name: value("name"),
        });
        break;
      case "role-grant":
        await apiPost(`/access/roles/${id}/permissions`, {
          permission: value("permission"),
        });
        break;
      case "role-assign":
        await apiPost(
          `/access/subjects/${encodeURIComponent(value("subject"))}/roles/${id}`,
          {},
        );
        break;
      default:
        return { status: "error", message: "Bilinmeyen işlem." };
    }
    revalidatePath("/tanimlamalar", "layout");
    for (const path of ["/documents", "/dosya-islemleri", "/tarama"]) revalidatePath(path);
    return { status: "success", message: "İşlem sunucuya kaydedildi." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError ? error.message : "Tanım kaydedilemedi.",
    };
  }
}
