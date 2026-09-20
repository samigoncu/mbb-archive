export const officeMimeTypes = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation", "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint",
]);
export const tiffMimeTypes = new Set([
  "image/tiff", "image/tif",
]);
export const renditionSupportedMimeTypes = new Set([
  ...officeMimeTypes,
  ...tiffMimeTypes,
]);
export const documentUploadAccept = ".pdf,.png,.jpg,.jpeg,.tiff,.tif,.docx,.xlsx,.pptx,.odt,.ods,.odp,.doc,.xls,.ppt";
export function isOfficeFile(file: { type: string; name: string }) {
  return officeMimeTypes.has(file.type) || /\.(docx?|xlsx?|pptx?|odt|ods|odp)$/i.test(file.name);
}
export function isRenditionSupported(mimeType?: string | null): boolean {
  if (!mimeType) return false;
  return renditionSupportedMimeTypes.has(mimeType);
}
