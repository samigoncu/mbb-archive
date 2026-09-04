const DEFAULT_API_BASE_URL = "http://localhost:5080/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    method: "GET",
  });
}

export async function apiPost<TRequest, TResponse>(
  path: string,
  body: TRequest,
  init?: RequestInit,
): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
}

export async function apiDelete<TResponse = void>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    ...init,
    method: "DELETE",
  });
}

export function getPublicApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_API_BASE_URL
  );
}

async function apiRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const problem = await tryReadProblem(response);

    throw new ApiError(
      problem.detail ?? `API request failed with ${response.status}.`,
      response.status,
      problem.code,
    );
  }

  // 204 No Content gövdesiz döner; JSON parse etmeye çalışmak hata verir.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getServerApiBaseUrl(): string {
  return (
    process.env.MBB_ARCHIVE_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_API_BASE_URL
  );
}

async function tryReadProblem(
  response: Response,
): Promise<{ detail?: string; code?: string }> {
  try {
    return (await response.json()) as { detail?: string; code?: string };
  } catch {
    return {};
  }
}
