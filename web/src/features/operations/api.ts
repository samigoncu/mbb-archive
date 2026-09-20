import { apiGet } from "@/lib/api/api-client";
import type { OperationsOverview } from "./types";

export async function getOperationsOverview(): Promise<OperationsOverview> {
  // Ortak istemci üzerinden gidilir; oturum jetonu ve hata biçimi tek yerde.
  return apiGet<OperationsOverview>("/operations/overview", {
    cache: "no-store",
  });
}
