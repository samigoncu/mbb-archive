export const maxUploadBytes = 200 * 1024 * 1024;
export function uploadSizeError(files: readonly { size: number }[], limit = maxUploadBytes): string | null {
  return files.some(file => file.size > limit)
    ? `Dosya başına en fazla ${Math.floor(limit / (1024 * 1024))} MB yükleyebilirsiniz.`
    : null;
}
