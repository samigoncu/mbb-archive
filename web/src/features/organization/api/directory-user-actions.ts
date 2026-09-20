"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/api-client";
import { saveDirectoryUser } from "@/features/organization/api/directory-users";
import type { DirectoryUser } from "@/features/organization/model/directory-user";

/**
 * Kullanıcı künyesini elle kaydeder.
 *
 * <para>
 * Dizin bağlı değilken tek yol budur; bağlıyken de dizindeki eksik ya da
 * yanlış adı düzeltmeye yarar. Elle kaydedilen künye sonraki dizin
 * eşitlemesinde ezilmez — düzeltme her eşitlemede geri alınmamalı.
 * </para>
 */
export async function saveDirectoryUserAction(
  subjectId: string,
  input: { displayName: string; email: string; title: string; isActive: boolean },
): Promise<{ data?: DirectoryUser; error?: string }> {
  try {
    const data = await saveDirectoryUser(subjectId, {
      displayName: input.displayName.trim(),
      email: input.email.trim() || null,
      title: input.title.trim() || null,
      isActive: input.isActive,
    });
    revalidatePath("/tanimlamalar/yetkiler");
    return { data };
  } catch (error) {
    return {
      error: error instanceof ApiError ? error.message : "Kullanıcı künyesi kaydedilemedi.",
    };
  }
}
