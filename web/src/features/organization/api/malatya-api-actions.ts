"use server";

import { revalidatePath } from "next/cache";
import { apiGet, apiPost, apiPut } from "@/lib/api/api-client";

export type MalatyaApiSettings = {
  baseUrl: string;
  userName: string;
  hasPassword: boolean;
  smsProvider: string;
  isDirectorySyncEnabled: boolean;
  isLdapEnabled: boolean;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  version: number;
  updatedAt: string | null;
  updatedBy: string;
};

export type MalatyaApiSettingsResult = {
  data?: MalatyaApiSettings;
  error?: string;
};

export type SaveMalatyaApiSettingsInput = {
  baseUrl: string;
  userName: string;
  password?: string | null;
  smsProvider: string;
  expectedVersion: number;
};

export type TestMalatyaApiConnectionInput = {
  baseUrl?: string;
  userName?: string;
  password?: string;
};

export type TestMalatyaApiResponse = {
  succeeded: boolean;
  token?: string | null;
  expires?: string | null;
  error?: string | null;
};

export type TestSmsInput = {
  message: string;
  to: string[];
  isOtp: boolean;
  provider?: string;
};

export type TestSmsResponse = {
  succeeded: boolean;
  providerReference?: string | null;
  error?: string | null;
};

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export async function loadMalatyaApiSettingsAction(): Promise<MalatyaApiSettingsResult> {
  try {
    const data = await apiGet<MalatyaApiSettings>("/organization/malatya-api/settings", {
      cache: "no-store",
    });
    return { data };
  } catch (error) {
    return { error: message(error, "Malatya API ayarları okunamadı.") };
  }
}

export async function saveMalatyaApiSettingsAction(
  input: SaveMalatyaApiSettingsInput,
): Promise<MalatyaApiSettingsResult> {
  try {
    const data = await apiPut<SaveMalatyaApiSettingsInput, MalatyaApiSettings>(
      "/organization/malatya-api/settings",
      input,
    );
    revalidatePath("/tanimlamalar/api");
    revalidatePath("/tanimlamalar/ldap");
    return { data };
  } catch (error) {
    return { error: message(error, "Malatya API ayarları kaydedilemedi.") };
  }
}

export async function testMalatyaApiConnectionAction(
  input?: TestMalatyaApiConnectionInput,
): Promise<TestMalatyaApiResponse> {
  try {
    const res = await apiPost<TestMalatyaApiConnectionInput | undefined, TestMalatyaApiResponse>(
      "/organization/malatya-api/test-connection",
      input,
    );
    revalidatePath("/tanimlamalar/api");
    return res;
  } catch (error) {
    return {
      succeeded: false,
      error: message(error, "Malatya API bağlantı testi başarısız oldu."),
    };
  }
}

export async function switchDirectorySourceAction(
  targetSource: "MalatyaApi" | "Ldap" | "None",
): Promise<MalatyaApiSettingsResult> {
  try {
    const data = await apiPost<{ targetSource: string }, MalatyaApiSettings>(
      "/organization/malatya-api/switch-directory",
      { targetSource },
    );
    revalidatePath("/tanimlamalar/api");
    revalidatePath("/tanimlamalar/ldap");
    revalidatePath("/tanimlamalar/birimler");
    return { data };
  } catch (error) {
    return { error: message(error, "Dizin kaynağı değiştirilemedi.") };
  }
}

export async function testMalatyaSmsAction(
  input: TestSmsInput,
): Promise<TestSmsResponse> {
  try {
    return await apiPost<TestSmsInput, TestSmsResponse>(
      "/organization/malatya-api/test-sms",
      input,
    );
  } catch (error) {
    return {
      succeeded: false,
      error: message(error, "SMS gönderimi başarısız oldu."),
    };
  }
}

