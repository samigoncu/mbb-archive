export type EvidenceValidationListItem = {
  id: string;
  documentId: string | null;
  documentVersionId: string | null;
  kind: string;
  status: string;
  provider: string;
  profile: string;
  contentSha256: string;
  startedAt: string;
  completedAt: string | null;
};

export type EvidenceCapabilities = {
  cms: string;
  rfc3161: string;
  pdfPades: string;
  pdfPadesConfigured?: boolean;
  timestampAuthorityConfigured?: boolean;
  maxInlineDecodedBytes: number;
};

export const evidenceKindLabels: Record<string, string> = {
  CmsSignature: "CMS / e-imza",
  Rfc3161Timestamp: "Zaman damgası",
  PdfPades: "PDF (PAdES)",
  EypPackage: "EYP paketi",
};

export const evidenceStatusLabels: Record<string, string> = {
  Pending: "Sürüyor",
  Valid: "Geçerli",
  Invalid: "Geçersiz",
  Indeterminate: "Belirsiz",
};

/**
 * "Belirsiz" bir başarısızlık değildir: doğrulama sonucu güvenle
 * belirlenemediğini söyler. Bu yüzden geçersizden ayrı renklendirilir.
 */
export const evidenceStatusVariants: Record<
  string,
  "success" | "destructive" | "warning" | "secondary"
> = {
  Pending: "secondary",
  Valid: "success",
  Invalid: "destructive",
  Indeterminate: "warning",
};
