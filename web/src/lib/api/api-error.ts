/**
 * API hata tipi. Sunucu istemcisinden ayrı durur: istemci bileşenleri de bu
 * sınıfı yakalar, oturum jetonuna dokunan kodu paketlerine çekmeden.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}
