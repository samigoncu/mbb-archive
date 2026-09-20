/**
 * Tarama stüdyosunda taranan belgeler için akıllı evrak konusu ve başlık öneri motoru.
 * Generic scanner isimlerini filtreler, PDF içeriğini analiz eder,
 * SDP ve dijital dosya bağlamından resmi başlıklar önerir.
 */

const GENERIC_SCANNER_PATTERN =
  /^(scan|tarama|img|image|photo|doc|belge|page|sayfa|dokuman|döküman|p\d+|file|adsiz|adsız|untitled|new_doc|camscanner|adobe_scan|taranan|evrak)[\s_\-\d]*$/i;

const NUMERIC_OR_TIMESTAMP_PATTERN = /^[\d\s_\-\.]+$/;

/**
 * Dosya adının bir tarayıcı çıktısı veya jenerik bir ad olup olmadığını tespit eder.
 */
export function isGenericScannerFilename(filename: string): boolean {
  const baseName = filename.replace(/\.[^/.]+$/, "").trim();
  if (!baseName) return true;
  if (GENERIC_SCANNER_PATTERN.test(baseName)) return true;
  if (NUMERIC_OR_TIMESTAMP_PATTERN.test(baseName)) return true;
  // Çok kısa veya anlamsız adlar (örn: "a", "1", "d1")
  if (baseName.length <= 2) return true;
  return false;
}

/**
 * Anlamlı dosya adlarını okunabilir resmi bir başlığa dönüştürür.
 * Örn: "kamulastirma_tespit_raporu_2026" -> "Kamulaştırma Tespit Raporu 2026"
 */
export function formatFilenameToTitle(filename: string): string {
  const baseName = filename.replace(/\.[^/.]+$/, "").trim();
  if (!baseName || isGenericScannerFilename(filename)) return "";

  return baseName
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => {
      if (!word) return "";
      const lower = word.toLocaleLowerCase("tr-TR");
      return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
    })
    .join(" ");
}

/**
 * PDF dosyasının ilk 128 KB'lık kısmını tarayıcıda okuyarak resmi yazışma
 * kalıplarını (Konu:, Karar, Dilekçe vb.) ayıklar.
 */
export async function inspectFileTextForSubject(file: File): Promise<string | null> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    // İleride Office/Txt dosyaları da genişletilebilir
    return null;
  }

  try {
    // İlk 128 KB resmi yazının başlık ve konu alanını kapsar
    const chunk = file.slice(0, 128 * 1024);
    const text = await chunk.text();

    if (!text || text.length < 20) return null;

    // 1. Resmi Yazışma "Konu:" satırı (Türkçe karakterler dahil)
    // Örn: "KONU : İmar Planı Değişikliği Hakkında"
    const topicPattern =
      /(?:KONU|Konu|konu)\s*[:\-–]\s*([^\r\n\\\/()]{4,120})/i;
    const topicMatch = text.match(topicPattern);
    if (topicMatch && topicMatch[1]) {
      const cleaned = cleanExtractedString(topicMatch[1]);
      if (cleaned && cleaned.length >= 4) {
        return cleaned;
      }
    }

    // 2. Karar ve Belge Türü Tespiti
    if (/MECL[İI]S\s+KARARI/i.test(text)) {
      const noMatch = text.match(/KARAR\s+NO\s*[:\-–]\s*([0-9\/\-\s]{1,20})/i);
      return noMatch ? `Meclis Kararı (Karar No: ${noMatch[1].trim()})` : "Belediye Meclis Kararı";
    }

    if (/ENC[ÜU]MEN\s+KARARI/i.test(text)) {
      const noMatch = text.match(/KARAR\s+NO\s*[:\-–]\s*([0-9\/\-\s]{1,20})/i);
      return noMatch ? `Encümen Kararı (Karar No: ${noMatch[1].trim()})` : "Belediye Encümen Kararı";
    }

    if (/[İI]HALE\s+KOM[İI]SYONU/i.test(text)) {
      return "İhale Komisyonu Kararı";
    }

    if (/BAŞKANLI[KĞ][Iİ]?\s*(?:MAKAMINA)?|BASKANLI[KĞ][Iİ]?\s*(?:MAKAMINA)?|D[İI]LEKÇE|D[İI]LEKCE/i.test(text)) {
      return "Vatandaş Talep Dilekçesi";
    }

    if (/TESL[İI]M\s+TESELL[ÜU]M\s+TUTANA[ĞG]I|TUTANAKTIR/i.test(text)) {
      return "Teslim Tesellüm Tutanağı";
    }

    if (/TEBL[İI][ĞG]\s+MAZBATASI|TEBL[İI][ĞG]AT/i.test(text)) {
      return "Tebligat Mazbatası";
    }

    if (/SÖZLEŞME\s+METN[İI]|PROTOKOL/i.test(text)) {
      return "Sözleşme / Protokol Metni";
    }

    // 3. PDF Bilgi Sözlüğü (/Title veya /Subject)
    const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/i);
    if (titleMatch && titleMatch[1]) {
      const extractedTitle = cleanExtractedString(titleMatch[1]);
      if (extractedTitle && !isGenericScannerFilename(extractedTitle) && extractedTitle.length >= 4) {
        return extractedTitle;
      }
    }

    const subjectMatch = text.match(/\/Subject\s*\(([^)]+)\)/i);
    if (subjectMatch && subjectMatch[1]) {
      const extractedSubject = cleanExtractedString(subjectMatch[1]);
      if (extractedSubject && extractedSubject.length >= 4) {
        return extractedSubject;
      }
    }

    return null;
  } catch {
    // İstemci tarafı okuma hatası durumunda sessizce null döner
    return null;
  }
}

function cleanExtractedString(raw: string): string {
  return raw
    .replace(/\\([()\\])/g, "$1") // PDF parantez kaçışlarını temizle
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\-:\s]+|[.\-:\s]+$/g, "")
    .trim();
}

export type SubjectSuggestionResult = {
  subject: string;
  source: "content" | "filename" | "classification" | "dossier" | "default";
};

/**
 * Belge ve mevcut bağlam (SDP, dijital dosya, birim) parametrelerine göre
 * en uygun evrak konusunu tespit eder veya önerir.
 */
export async function suggestDocumentSubject(params: {
  file?: File;
  classificationTitle?: string;
  dossierTitle?: string;
  unitName?: string;
}): Promise<SubjectSuggestionResult> {
  const { file, classificationTitle, dossierTitle, unitName } = params;

  // 1. Dosya içeriğinden tespit
  if (file) {
    const fromContent = await inspectFileTextForSubject(file);
    if (fromContent) {
      return { subject: fromContent, source: "content" };
    }
  }

  // 2. Dosya adı anlamlıysa dosya adından türet
  if (file && !isGenericScannerFilename(file.name)) {
    const formatted = formatFilenameToTitle(file.name);
    if (formatted) {
      return { subject: formatted, source: "filename" };
    }
  }

  // 3. Seçili SDP Konusu
  if (classificationTitle && classificationTitle.trim().length > 0) {
    const cleanSdp = classificationTitle.trim();
    return {
      subject: cleanSdp.toLowerCase().endsWith("belgesi") || cleanSdp.toLowerCase().endsWith("evrakı")
        ? cleanSdp
        : `${cleanSdp} Evrakı`,
      source: "classification",
    };
  }

  // 4. Seçili Dijital Dosya Başlığı
  if (dossierTitle && dossierTitle.trim().length > 0) {
    return {
      subject: `${dossierTitle.trim()} Üst Yazısı`,
      source: "dossier",
    };
  }

  // 5. Birim Adı veya Varsayılan
  if (unitName && unitName.trim().length > 0) {
    return {
      subject: `${unitName.trim()} Resmi Yazısı`,
      source: "default",
    };
  }

  return { subject: "Resmi Yazı ve Ekleri", source: "default" };
}

/**
 * Operatörün tek tıkla seçebileceği bağlamsal hızlı başlık şablon çipleri listesi üretir.
 */
export function buildSubjectChips(params: {
  classificationTitle?: string;
  dossierTitle?: string;
  detectedSubject?: string;
}): string[] {
  const chips: string[] = [];

  if (params.detectedSubject && !chips.includes(params.detectedSubject)) {
    chips.push(params.detectedSubject);
  }

  if (params.classificationTitle) {
    const sdp = params.classificationTitle.trim();
    if (!chips.includes(sdp)) chips.push(sdp);
    chips.push(`${sdp} Evrakı`);
  }

  if (params.dossierTitle) {
    const dossier = params.dossierTitle.trim();
    chips.push(`${dossier} Üst Yazısı`);
  }

  const standardTemplates = [
    "Resmi Yazı / Üst Yazı",
    "Talep Dilekçesi",
    "Meclis Kararı",
    "Encümen Kararı",
    "Komisyon Raporu",
    "Teslim Tesellüm Tutanağı",
    "Onay Belgesi (Olur)",
  ];

  for (const t of standardTemplates) {
    if (!chips.includes(t) && chips.length < 8) {
      chips.push(t);
    }
  }

  return chips.slice(0, 8);
}
