/**
 * Tarama stüdyosunda taranan belgeler için akıllı evrak konusu, semantik ilişki tespiti
 * ve standart dosya adı öneri motoru.
 * Generic scanner isimlerini filtreler, semantik kısaltmaları genişletir (örn: ADSL ekim),
 * PDF içeriğini analiz eder, SDP/dosya bağlamından resmi başlık ve dosya adı üretir.
 */

const GENERIC_SCANNER_PATTERN =
  /^(scan|tarama|img|image|photo|doc|belge|page|sayfa|dokuman|döküman|p\d+|file|adsiz|adsız|untitled|new_doc|camscanner|adobe_scan|taranan)[\s_\-\d]*$/i;

const NUMERIC_OR_TIMESTAMP_PATTERN = /^[\d\s_\-\.]+$/;

const MONTH_NAMES: Record<string, string> = {
  ocak: "Ocak Ayı",
  subat: "Şubat Ayı",
  şubat: "Şubat Ayı",
  mart: "Mart Ayı",
  nisan: "Nisan Ayı",
  mayis: "Mayıs Ayı",
  mayıs: "Mayıs Ayı",
  haziran: "Haziran Ayı",
  temmuz: "Temmuz Ayı",
  agustos: "Ağustos Ayı",
  ağustos: "Ağustos Ayı",
  eylul: "Eylül Ayı",
  eylül: "Eylül Ayı",
  ekim: "Ekim Ayı",
  kasim: "Kasım Ayı",
  kasım: "Kasım Ayı",
  aralik: "Aralık Ayı",
  aralık: "Aralık Ayı",
};

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

export function extractYearFromText(text: string): number | null {
  const dateMatch =
    text.match(/\b(?:\d{1,2}[./\-])(?:\d{1,2}[./\-])(20\d\d|19\d\d)\b/) ||
    text.match(/\b(20\d\d|19\d\d)[./\-]\d{1,2}[./\-]\d{1,2}\b/);
  if (dateMatch) {
    return parseInt(dateMatch[1], 10);
  }
  return null;
}

/**
 * Dosya adındaki parçalı kısaltmaları (örn: "ADSL ekim", "maski_su", "maas_bordro")
 * belediyecilik semantik sözlüğüyle genişleterek yıl ve ayı içeren anlamlı bir resmi başlığa dönüştürür.
 */
export function detectSemanticSubjectFromKeywords(
  filename: string,
  fallbackYear?: number,
): string | null {
  const base = filename.replace(/\.[^/.]+$/, "").toLocaleLowerCase("tr-TR");
  if (!base || base.length < 3) return null;

  // Alt çizgi, tire ve noktaları boşluğa çevirerek sözcük sınırlarını netleştir
  const cleanBase = base.replace(/[_.\-]+/g, " ").trim();

  // Yıl tespiti:
  // 1. Dosya adında 4 basamaklı yıl (örn: "2025", "2026")
  let detectedYear: number | null = null;
  const fourDigitMatch = cleanBase.match(/\b(19\d\d|20\d\d)\b/);
  if (fourDigitMatch) {
    detectedYear = parseInt(fourDigitMatch[1], 10);
  } else {
    // 2. Ay bitişiğindeki 2 basamaklı yıl (örn: "ekim 24", "ekim 26")
    const twoDigitMatch = cleanBase.match(
      /(?:ocak|subat|şubat|mart|nisan|mayis|mayıs|haziran|temmuz|agustos|ağustos|eylul|eylül|ekim|kasim|kasım|aralik|aralık)\s*(\d{2})\b/i,
    );
    if (twoDigitMatch) {
      detectedYear = 2000 + parseInt(twoDigitMatch[1], 10);
    } else if (fallbackYear && fallbackYear >= 1990 && fallbackYear <= 2099) {
      detectedYear = fallbackYear;
    } else {
      detectedYear = new Date().getFullYear();
    }
  }

  // Ay tespiti
  let detectedMonth: string | null = null;
  for (const [key, label] of Object.entries(MONTH_NAMES)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(cleanBase)) {
      detectedMonth = label;
      break;
    }
  }

  // Dönem formatı: örn. "2026 Yılı Ekim Ayı" veya "2026 Yılı"
  let period = "";
  if (detectedYear && detectedMonth) {
    period = `${detectedYear} Yılı ${detectedMonth}`;
  } else if (detectedMonth) {
    period = `${detectedYear ?? new Date().getFullYear()} Yılı ${detectedMonth}`;
  } else if (detectedYear) {
    period = `${detectedYear} Yılı`;
  }

  // Ödeme / Makbuz / Dekont eki tespiti
  const isPayment = /odeme|ödeme|makbuz|dekont|tahsilat|fisi|fişi/i.test(cleanBase);

  // 1. Mobil & GSM & Telefon (Avea, Turkcell, Vodafone, Telekom vb.)
  if (/avea|turkcell|vodafone|gsm|mobil\s*hat|telefon\b|santral\b|cep\s*fatura|telsiz/i.test(cleanBase)) {
    const docType = isPayment ? "GSM / Telefon Hizmet Faturası ve Ödeme Makbuzu" : "GSM / Telefon Hizmet Faturası";
    return period ? `${period} ${docType}` : docType;
  }

  // 2. Telekom & İnternet & ADSL & Fiber
  if (/adsl|fiber|ttnet|superonline|turknet|uydunet|internet/i.test(cleanBase)) {
    const docType = isPayment ? "ADSL / İnternet Hizmet Faturası ve Ödeme Makbuzu" : "ADSL / İnternet Hizmet Faturası";
    return period ? `${period} ${docType}` : docType;
  }

  // 3. Genel Telekomünikasyon
  if (/telekom/i.test(cleanBase)) {
    const docType = isPayment ? "Telekomünikasyon Hizmet Faturası ve Ödeme Makbuzu" : "Telekomünikasyon Hizmet Faturası";
    return period ? `${period} ${docType}` : docType;
  }

  // 4. Su ve Kanalizasyon (MASKİ / İSKİ vb.)
  if (
    /maski|iski|aski|kaski|deski|su\s*fatura|su\s*abone|su\s*makbuz|su\s*tuketim|su\s*tüketim/i.test(cleanBase) ||
    (/\bsu\b/i.test(cleanBase) && (detectedMonth || /fatura|odeme|ödeme|abone|makbuz/i.test(cleanBase)))
  ) {
    const docType = isPayment ? "Su ve Kanalizasyon Hizmet Faturası ve Ödeme Makbuzu" : "Su ve Kanalizasyon Hizmet Faturası";
    return period ? `${period} ${docType}` : docType;
  }

  // 5. Elektrik / Aydınlatma / TEDAŞ
  if (/elektrik|tedas|tedaş|gediz|enerjisa|toroslar|aydem|aksa\s*elektrik|sayac|sayaç|trafo|aydinlatma|aydınlatma/i.test(cleanBase)) {
    const docType = isPayment ? "Elektrik Tesis Faturası ve Ödeme Makbuzu" : "Elektrik Tesis Abonelik Faturası";
    return period ? `${period} ${docType}` : docType;
  }

  // 6. Doğalgaz / Isınma
  if (/dogalgaz|doğalgaz|aksa\s*gaz|igdas|i̇gdaş|baskentgaz|başkentgaz|isinma|ısınma|kalorifer|kombi|lng|cng/i.test(cleanBase)) {
    const docType = isPayment ? "Doğalgaz Tesis Faturası ve Ödeme Makbuzu" : "Doğalgaz Tesis Abonelik Faturası";
    return period ? `${period} ${docType}` : docType;
  }

  // 7. Akaryakıt / Yakıt / Mazot / Taşıt Tanıma (Hizmet Araçları)
  if (/akaryakit|akaryakıt|benzin|mazot|motorin|yakit|yakıt|petrol\s*ofisi|opet|shell|tasit\s*tanima|taşıt\s*tanıma|tts/i.test(cleanBase)) {
    const docType = isPayment ? "Hizmet Araçları Akaryakıt Alım Faturası ve Ödeme Makbuzu" : "Hizmet Araçları Akaryakıt ve Yakıt Tüketim Faturası";
    return period ? `${period} ${docType}` : docType;
  }

  // 8. Personel & Maaş & Bordro & Puantaj
  if (/bordro|maas|maaş|puantaj|ozluk|özlük/i.test(cleanBase)) {
    return period
      ? `${period} Personel Maaş Bordrosu`
      : "Personel Maaş Bordrosu";
  }

  // 9. SGK & Prim & Vergi & Harç & Muhasebe Dekontları
  if (/sgk|prim|muhtasar|kdv|vergi|harc\b|harç\b/i.test(cleanBase)) {
    const docType = isPayment ? "Vergi / SGK Prim Tahakkuk ve Ödeme Dekontu" : "Vergi / SGK Prim ve Tahakkuk Belgesi";
    return period ? `${period} ${docType}` : docType;
  }

  // 10. Banka Dekontu / EFT / Havale
  if (/dekont|havale|eft|pos\s*rapor|tahsilat|hesap\s*ekstre/i.test(cleanBase)) {
    const docType = "Banka İşlem Dekontu ve Tahsilat Makbuzu";
    return period ? `${period} ${docType}` : docType;
  }

  // 11. Araç Bakım / Muayene / Sigorta / Kasko
  if (/kasko|trafik\s*sigorta|sigorta\s*polic|muayene|tuvturk|tüvtürk|oto\s*bakim|oto\s*tamir|yedek\s*parca|lastik/i.test(cleanBase)) {
    if (/muayene|tuvturk|tüvtürk/i.test(cleanBase)) {
      return period ? `${period} Hizmet Araçları Muayene ve Harç Belgesi` : "Hizmet Araçları Muayene ve Harç Belgesi";
    }
    if (/kasko|sigorta/i.test(cleanBase)) {
      return period ? `${period} Hizmet Araçları Sigorta ve Kasko Poliçesi` : "Hizmet Araçları Sigorta ve Kasko Poliçesi";
    }
    return period ? `${period} Hizmet Araçları Bakım Onarım ve Yedek Parça Faturası` : "Hizmet Araçları Bakım Onarım ve Yedek Parça Faturası";
  }

  // 12. Bilgi İşlem / Yazılım / Lisans / Donanım
  if (/lisans|server|sunucu|domain|hosting|ssl|toner|kartus|kartuş|donanim|donanım|yazilim|yazılım/i.test(cleanBase)) {
    if (/toner|kartus|kartuş/i.test(cleanBase)) {
      return period ? `${period} Yazıcı ve Toner Sarf Malzemesi Alım Faturası` : "Yazıcı ve Toner Sarf Malzemesi Alım Faturası";
    }
    if (/lisans|yazilim|yazılım/i.test(cleanBase)) {
      return period ? `${period} Yazılım ve Sistem Lisans Faturası` : "Yazılım ve Sistem Lisans Faturası";
    }
    return period ? `${period} Bilişim Donanım ve Sistem Alım Faturası` : "Bilişim Donanım ve Sistem Alım Faturası";
  }

  // 13. Hakediş & Hizmet Alımı (Temizlik, Yemek, Güvenlik vb.)
  if (/hakedis|hakediş/i.test(cleanBase)) {
    if (/temizlik/i.test(cleanBase)) {
      return period ? `${period} Temizlik Hizmet Alımı Hakediş Dosyası` : "Temizlik Hizmet Alımı Hakediş Dosyası";
    }
    if (/yemek/i.test(cleanBase)) {
      return period ? `${period} Yemek Hizmet Alımı Hakediş Dosyası` : "Yemek Hizmet Alımı Hakediş Dosyası";
    }
    if (/guvenlik|güvenlik/i.test(cleanBase)) {
      return period ? `${period} Özel Güvenlik Hizmet Alımı Hakediş Dosyası` : "Özel Güvenlik Hizmet Alımı Hakediş Dosyası";
    }
    return period ? `${period} Hizmet Alımı Hakediş ve Ödeme Dosyası` : "Hizmet Alımı Hakediş ve Ödeme Dosyası";
  }

  // 14. Kararlar (Meclis / Encümen)
  if (/meclis/i.test(cleanBase)) {
    const noMatch = cleanBase.match(/\b(\d{1,5})\b/);
    const yrPrefix = detectedYear ? `${detectedYear} Yılı ` : "";
    return noMatch
      ? `${yrPrefix}Belediye Meclis Kararı (No: ${noMatch[1]})`
      : `${yrPrefix}Belediye Meclis Kararı`;
  }

  if (/encumen|encümen/i.test(cleanBase)) {
    const noMatch = cleanBase.match(/\b(\d{1,5})\b/);
    const yrPrefix = detectedYear ? `${detectedYear} Yılı ` : "";
    return noMatch
      ? `${yrPrefix}Belediye Encümen Kararı (No: ${noMatch[1]})`
      : `${yrPrefix}Belediye Encümen Kararı`;
  }

  // 15. İmar / Yapı Ruhsatı / İskan
  if (/ruhsat|iskan|iskân/i.test(cleanBase)) {
    return detectedYear
      ? `${detectedYear} Yılı Yapı Ruhsatı ve İskan Belgesi`
      : "Yapı Ruhsatı ve İskan Belgesi";
  }

  if (/kamulastirma|kamulaştırma/i.test(cleanBase)) {
    return detectedYear
      ? `${detectedYear} Yılı Kamulaştırma Karar ve Tespit Dosyası`
      : "Kamulaştırma Karar ve Tespit Dosyası";
  }

  // 16. Genel Ödeme / Fatura / Makbuz (Belirli kategori eşleşmediyse ama ödeme/fatura kelimesi varsa)
  if (isPayment || /fatura|makbuz/i.test(cleanBase)) {
    const docType = isPayment ? "Gider ve Ödeme Makbuzu" : "Hizmet ve Mal Alım Faturası";
    return period ? `${period} ${docType}` : docType;
  }

  return null;
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
 * Başlık ve orijinal uzantıdan kurumsal arşiv standartlarında temiz dosya adı üretir.
 * Örn: "Ekim Ayı ADSL / İnternet Hizmet Faturası" -> "Ekim_Ayi_ADSL_Internet_Hizmet_Faturasi.pdf"
 */
export function generateStandardArchiveFilename(
  title: string,
  originalFilename: string,
  classificationCode?: string,
): string {
  const extMatch = originalFilename.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "pdf";

  const transliterated = title
    .replace(/ğ/g, "g").replace(/Ğ/g, "G")
    .replace(/ü/g, "u").replace(/Ü/g, "U")
    .replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ı/g, "i").replace(/I/g, "I")
    .replace(/İ/g, "I").replace(/i/g, "i")
    .replace(/ö/g, "o").replace(/Ö/g, "O")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/[^a-zA-Z0-9\s_\-]/g, "")
    .trim()
    .replace(/[\s_\-]+/g, "_");

  const safeTitle = transliterated || "Belge";

  if (classificationCode && !safeTitle.startsWith(classificationCode.replace(/[^a-zA-Z0-9]/g, ""))) {
    const safeCode = classificationCode.replace(/[^a-zA-Z0-9.]/g, "");
    return `${safeCode}_${safeTitle}.${ext}`;
  }

  return `${safeTitle}.${ext}`;
}

/**
 * Web File nesnesini yeni bir dosya adıyla kopyalar.
 */
export function renameScannedFile(file: File, newName: string): File {
  return new File([file], newName, {
    type: file.type,
    lastModified: file.lastModified,
  });
}

/**
 * PDF dosyasının ilk 128 KB'lık kısmını tarayıcıda okuyarak resmi yazışma
 * kalıplarını (Konu:, Karar, Dilekçe vb.) ayıklar.
 */
export async function inspectFileTextForSubject(file: File): Promise<string | null> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return null;
  }

  try {
    const chunk = file.slice(0, 128 * 1024);
    const text = await chunk.text();

    if (!text || text.length < 20) return null;

    // 1. Resmi Yazışma "Konu:" satırı (Türkçe karakterler dahil)
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

    // 4. Kurumsal Fatura / Makbuz İçerik Tespiti (Örn: Generic taranmış scan_0001.pdf içindeki faturalar)
    const yr = extractYearFromText(text) ?? new Date().getFullYear();
    if (/AVEA|TURKCELL|VODAFONE|TÜRK\s*TELEKOM|TURK\s*TELEKOM/i.test(text) && /FATURA|ABONE/i.test(text)) {
      return `${yr} Yılı Telefon / GSM Hizmet Faturası`;
    }
    if (/MASK[İI]|SU\s+VE\s+KANAL[İI]ZASYON|SU\s+FATURA/i.test(text)) {
      return `${yr} Yılı Su ve Kanalizasyon Hizmet Faturası`;
    }
    if (/TEDA[ŞS]|ELEKTR[İI]K\s+FATURA|ENERJ[İI]SA|TOROSLAR|GED[İI]Z/i.test(text)) {
      return `${yr} Yılı Elektrik Tüketim Faturası`;
    }
    if (/DO[ĞG]ALGAZ|AKSA\s*GAZ|[İI]GDA[ŞS]|BA[ŞS]KENTGAZ/i.test(text)) {
      return `${yr} Yılı Doğalgaz Tüketim Faturası`;
    }

    return null;
  } catch {
    return null;
  }
}

function cleanExtractedString(raw: string): string {
  return raw
    .replace(/\\([()\\])/g, "$1")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\-:\s]+|[.\-:\s]+$/g, "")
    .trim();
}

export type SubjectSuggestionResult = {
  subject: string;
  suggestedFilename: string;
  source: "content" | "semantic" | "filename" | "classification" | "dossier" | "default";
};

/**
 * Belge ve mevcut bağlam (SDP, dijital dosya, birim) parametrelerine göre
 * en uygun evrak konusunu ve standart dosya adını tespit eder veya önerir.
 */
export async function suggestDocumentSubject(params: {
  file?: File;
  classificationTitle?: string;
  classificationCode?: string;
  dossierTitle?: string;
  unitName?: string;
}): Promise<SubjectSuggestionResult> {
  const { file, classificationTitle, classificationCode, dossierTitle, unitName } = params;

  let subject = "Resmi Yazı ve Ekleri";
  let source: SubjectSuggestionResult["source"] = "default";

  // 1. Dosya içeriğinden tespit
  if (file) {
    const fromContent = await inspectFileTextForSubject(file);
    if (fromContent) {
      subject = fromContent;
      source = "content";
    }
  }

  // 2. Semantik anahtar kelime eşleşmesi (örn: "ADSL ekim" -> "2026 Yılı Ekim Ayı ADSL / İnternet Hizmet Faturası")
  if (source === "default" && file) {
    let textYear: number | undefined;
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const chunk = file.slice(0, 128 * 1024);
        const text = await chunk.text();
        const y = extractYearFromText(text);
        if (y) textYear = y;
      } catch {
        // sessizce geç
      }
    }
    const semantic = detectSemanticSubjectFromKeywords(file.name, textYear);
    if (semantic) {
      subject = semantic;
      source = "semantic";
    }
  }

  // 3. Dosya adı anlamlıysa dosya adından türet
  if (source === "default" && file && !isGenericScannerFilename(file.name)) {
    const formatted = formatFilenameToTitle(file.name);
    if (formatted) {
      subject = formatted;
      source = "filename";
    }
  }

  // 4. Seçili SDP Konusu
  if (source === "default" && classificationTitle && classificationTitle.trim().length > 0) {
    const cleanSdp = classificationTitle.trim();
    subject = cleanSdp.toLowerCase().endsWith("belgesi") || cleanSdp.toLowerCase().endsWith("evrakı")
      ? cleanSdp
      : `${cleanSdp} Evrakı`;
    source = "classification";
  }

  // 5. Seçili Dijital Dosya Başlığı
  if (source === "default" && dossierTitle && dossierTitle.trim().length > 0) {
    subject = `${dossierTitle.trim()} Üst Yazısı`;
    source = "dossier";
  }

  // 6. Birim Adı
  if (source === "default" && unitName && unitName.trim().length > 0) {
    subject = `${unitName.trim()} Resmi Yazısı`;
    source = "default";
  }

  const suggestedFilename = file
    ? generateStandardArchiveFilename(subject, file.name, classificationCode)
    : `${subject}.pdf`;

  return { subject, suggestedFilename, source };
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
