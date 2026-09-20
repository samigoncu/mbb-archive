export type BrandingAssetKind = "logo" | "favicon" | "login";

export type BrandingAssetView = {
  kind: BrandingAssetKind;
  /** upload: yüklenen dosya · url: dış adres · default: uygulamayla gelen görsel */
  source: "upload" | "url" | "default";
  url: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  updatedAt: string | null;
};

export type Branding = {
  siteTitle: string;
  institutionName: string;
  description: string;
  departmentName?: string | null;
  logo: BrandingAssetView;
  favicon: BrandingAssetView;
  loginImage: BrandingAssetView;
  version: number;
  updatedBy: string;
  updatedAt: string | null;
};

/** API erişilemezse uygulama başlıksız kalmasın; arayüzdeki sabit metinlerin karşılığı. */
export const defaultBranding: Branding = {
  siteTitle: "MBB Kurumsal Arşiv",
  institutionName: "T.C. MERSİN BÜYÜKŞEHİR BELEDİYESİ",
  description: "Kurumsal Belge, Arşiv ve Dijital Hafıza Platformu",
  departmentName: "Yazı İşleri ve Kararlar Dairesi Başkanlığı · Arşiv Şube Müdürlüğü",
  logo: { kind: "logo", source: "default", url: null, fileName: null, sizeBytes: null, updatedAt: null },
  favicon: { kind: "favicon", source: "default", url: null, fileName: null, sizeBytes: null, updatedAt: null },
  loginImage: { kind: "login", source: "default", url: null, fileName: null, sizeBytes: null, updatedAt: null },
  version: 0,
  updatedBy: "system",
  updatedAt: null,
};

export const brandingAssetLabels: Record<BrandingAssetKind, string> = {
  logo: "Logo",
  favicon: "Favicon",
  login: "Giriş ekranı görseli",
};

/** Depoda duran varsayılan görseller; yükleme de adres de yoksa bunlar kullanılır. */
export const brandingAssetDefaults: Record<BrandingAssetKind, string | null> = {
  logo: "/images/logo.png",
  favicon: null,
  login: "/images/digital-archive-login.svg",
};

/**
 * Tarayıcının kullanabileceği adres.
 *
 * Yüklenen görsel API'de duruyor; tarayıcı API'ye doğrudan gidemediği için
 * adres web tarafındaki vekil uca çevrilir. Sürüm parametresi korunur, yoksa
 * logo değiştiğinde tarayıcı eskisini göstermeye devam eder.
 */
export function brandingAssetUrl(asset: BrandingAssetView): string | null {
  if (asset.source === "upload" && asset.url) {
    return asset.url.replace("/api/v1/operations/branding/assets/", "/api/branding/assets/");
  }
  if (asset.source === "url") return asset.url;
  return brandingAssetDefaults[asset.kind];
}
