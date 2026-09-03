import type { OperationsOverview } from "./types";

const apiBaseUrl =
  process.env.MBB_ARCHIVE_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:5080/api/v1";

export async function getOperationsOverview(): Promise<OperationsOverview> {
  const response = await fetch(`${apiBaseUrl}/operations/overview`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Operations API returned ${response.status}.`);
  }

  return response.json() as Promise<OperationsOverview>;
}
