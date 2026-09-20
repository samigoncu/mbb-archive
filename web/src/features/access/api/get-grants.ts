import { apiGet } from "@/lib/api/api-client";
import type { AccessGrant, SubjectVisibility } from "@/features/access/model/grants";

/** Bir kaynağa verilmiş paylaşımlar: "bu belgeyi kim görüyor". */
export async function getResourceGrants(
  resourceType: string,
  resourceKey: string,
): Promise<AccessGrant[]> {
  const params = new URLSearchParams({ resourceType, resourceKey });

  return apiGet<AccessGrant[]>(`/access/grants/?${params}`, {
    cache: "no-store",
  });
}

/** "Bu kullanıcı neyi görüyor" raporu. */
export async function getSubjectVisibility(
  subjectId: string,
): Promise<SubjectVisibility> {
  return apiGet<SubjectVisibility>(
    `/access/visibility/${encodeURIComponent(subjectId)}`,
    { cache: "no-store" },
  );
}
