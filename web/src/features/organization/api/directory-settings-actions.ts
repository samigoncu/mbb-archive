"use server";

import { revalidatePath } from "next/cache";
import { apiGet, apiPut } from "@/lib/api/api-client";

export type DirectorySettings = {
  isEnabled: boolean;
  host: string;
  port: number;
  useSsl: boolean;
  bindDn: string;
  /** Parolanın kendisi hiçbir zaman gelmez; yalnız tanımlı olup olmadığı. */
  hasBindPassword: boolean;
  /** Kayıtlı parola çözülemiyor; şifreleme anahtarı değişmiş olabilir. */
  bindPasswordUnreadable: boolean;
  userSearchBase: string;
  unitSearchBase: string;
  userFilter: string;
  unitFilter: string;
  unitAttribute: string;
  groupAttribute: string;
  displayNameAttribute: string;
  mailAttribute: string;
  timeoutSeconds: number;
  provisionOnLogin: boolean;
  version: number;
  updatedAt: string | null;
  updatedBy: string;
};

export type DirectorySettingsResult = { data?: DirectorySettings; error?: string };

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export async function loadDirectorySettingsAction(): Promise<DirectorySettingsResult> {
  try {
    return { data: await apiGet<DirectorySettings>("/organization/directory/settings", { cache: "no-store" }) };
  } catch (error) {
    return { error: message(error, "Dizin ayarları okunamadı.") };
  }
}

export type SaveDirectorySettings = Omit<DirectorySettings, "hasBindPassword" | "bindPasswordUnreadable" | "updatedAt" | "updatedBy"> & {
  /** null: parolayı değiştirme · "": parolayı sil · dolu: yeni parola. */
  bindPassword: string | null;
  expectedVersion: number;
};

export async function saveDirectorySettingsAction(
  input: SaveDirectorySettings,
): Promise<DirectorySettingsResult> {
  try {
    const data = await apiPut<SaveDirectorySettings, DirectorySettings>("/organization/directory/settings", input);
    revalidatePath("/tanimlamalar/ldap");
    revalidatePath("/tanimlamalar/birimler");
    return { data };
  } catch (error) {
    return { error: message(error, "Dizin ayarları kaydedilemedi.") };
  }
}
