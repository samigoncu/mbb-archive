"use server";
import { revalidatePath } from "next/cache";
import { apiPost, ApiError } from "@/lib/api/api-client";

export async function validatePdfAction(_: { status: string; message: string }, form: FormData) {
  const file = form.get("pdf");
  if (!(file instanceof File) || !file.size || file.size > 32 * 1024 * 1024) return {status: "error", message: "En fazla 32 MB boyutunda bir PDF seçin."};
  try {
    const result = await apiPost<{pdfBase64: string}, {id: string; status: string}>("/evidence/pdf/validate", { pdfBase64: Buffer.from(await file.arrayBuffer()).toString("base64") });
    revalidatePath("/kanit");
    const label: Record<string, string> = { Valid: "Geçerli", Invalid: "Geçersiz", Indeterminate: "Belirsiz" };
    return {status: "success", message: `Doğrulama kaydedildi. Sonuç: ${label[result.status] ?? result.status}.`};
  } catch (error) { return {status: "error", message: error instanceof ApiError ? error.message : "PDF doğrulaması tamamlanamadı."}; }
}
