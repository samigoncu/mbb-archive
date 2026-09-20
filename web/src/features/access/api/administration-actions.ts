"use server";
import { revalidatePath } from "next/cache";
import { apiPost, apiPut, apiDelete, ApiError } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
export async function accessAdministrationAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const value = (key: string) => String(form.get(key) ?? "").trim();
  try {
    switch (value("operation")) {
      case "role-delete":
        if (value("confirm") !== "on") return { status: "error", message: "Rol silme onayı gerekli." };
        await apiDelete(`/access/roles/${encodeURIComponent(value("id"))}?expectedVersion=${encodeURIComponent(value("version"))}`); break;
      case "role-create":
        await apiPost("/access/roles", { code: value("code"), name: value("name") }); break;
      case "role-update":
        await apiPut(`/access/roles/${encodeURIComponent(value("id"))}`, { name: value("name"), permissions: form.getAll("permissions").map(String), expectedVersion: value("version") }); break;
      case "subject-update":
        await apiPut(`/access/subjects/${encodeURIComponent(value("subject"))}/roles`, { roleIds: form.getAll("roleIds").map(String), expectedVersion: value("version") }); break;
      default: return { status: "error", message: "İşlem tanınmadı." };
    }
    revalidatePath("/", "layout");
    return { status: "success", message: "Yetki tanımları kaydedildi." };
  } catch (error) {
    return { status: "error", message: error instanceof ApiError ? error.message : "Yetki tanımları kaydedilemedi." };
  }
}
