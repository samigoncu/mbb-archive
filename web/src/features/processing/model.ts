export const processingStages: Record<string,string> = {
  Queued:"Kuyrukta",PdfInspectionRequested:"PDF incelemesi bekleniyor",OcrRequested:"OCR sonucu bekleniyor",
  TextExtractionRequested:"Dönüştürme / metin çıkarma bekleniyor",AwaitingIndex:"İndeksleme bekleniyor",
  AwaitingQualityControl:"Kalite kontrol bekleniyor",Completed:"Tamamlandı",Failed:"Başarısız",Unsupported:"Biçim desteklenmiyor",
};

export type ProcessingItem = {
  id: string;
  documentId: string;
  documentVersionId: string;
  stage: string;
  mimeType: string;
  createdAt: string;
  completedAt: string | null;
  failureCode: string | null;
  failureDetail: string | null;
  pageCount: number | null;
  hasText: boolean;
  hasPdf: boolean;
  hasOcr: boolean;
};

export type ProcessingProgress = {
  percentage: number;
  stageName: string;
  stepIndex: number;
  totalSteps: number;
  statusText: string;
  isComplete: boolean;
  isFailed: boolean;
  variant: "completed" | "in_progress" | "failed" | "unsupported" | "queued";
};

export const PIPELINE_STEPS = [
  { step: 1, name: "Kuyruk", percent: 10 },
  { step: 2, name: "Ön İnceleme", percent: 30 },
  { step: 3, name: "OCR / Metin", percent: 60 },
  { step: 4, name: "İndeksleme", percent: 85 },
  { step: 5, name: "Tamamlandı", percent: 100 },
] as const;

export function getProcessingProgress(job: ProcessingItem): ProcessingProgress {
  switch (job.stage) {
    case "Completed":
      return {
        percentage: 100,
        stageName: "Tamamlandı",
        stepIndex: 5,
        totalSteps: 5,
        statusText: "İşlem başarıyla tamamlandı",
        isComplete: true,
        isFailed: false,
        variant: "completed",
      };
    case "AwaitingQualityControl":
      return {
        percentage: 92,
        stageName: "Kalite Kontrol",
        stepIndex: 4,
        totalSteps: 5,
        statusText: "Kalite kontrol denetimi bekleniyor",
        isComplete: false,
        isFailed: false,
        variant: "in_progress",
      };
    case "AwaitingIndex":
      return {
        percentage: 85,
        stageName: "Arama İndeksleme",
        stepIndex: 4,
        totalSteps: 5,
        statusText: "Arama motoru indekslemesi bekleniyor",
        isComplete: false,
        isFailed: false,
        variant: "in_progress",
      };
    case "OcrRequested":
      return {
        percentage: job.hasText ? 65 : 55,
        stageName: "OCR İşleme",
        stepIndex: 3,
        totalSteps: 5,
        statusText: "Optik karakter tanıma (OCR) yürütülüyor",
        isComplete: false,
        isFailed: false,
        variant: "in_progress",
      };
    case "TextExtractionRequested":
      return {
        percentage: 50,
        stageName: "Metin Çıkarımı",
        stepIndex: 3,
        totalSteps: 5,
        statusText: "Metin ve biçim dönüşümü yapılıyor",
        isComplete: false,
        isFailed: false,
        variant: "in_progress",
      };
    case "PdfInspectionRequested":
      return {
        percentage: 30,
        stageName: "PDF İnceleme",
        stepIndex: 2,
        totalSteps: 5,
        statusText: "PDF sayfa ve güvenlik incelemesi",
        isComplete: false,
        isFailed: false,
        variant: "in_progress",
      };
    case "Queued":
      return {
        percentage: 10,
        stageName: "Kuyrukta",
        stepIndex: 1,
        totalSteps: 5,
        statusText: "İşlem sırası bekleniyor",
        isComplete: false,
        isFailed: false,
        variant: "queued",
      };
    case "Failed": {
      const lateFailure = Boolean(job.hasOcr || job.hasText);
      return {
        percentage: lateFailure ? 85 : 35,
        stageName: "Başarısız",
        stepIndex: lateFailure ? 4 : 2,
        totalSteps: 5,
        statusText: job.failureDetail || "İşlem adımı başarısız oldu",
        isComplete: false,
        isFailed: true,
        variant: "failed",
      };
    }
    case "Unsupported":
      return {
        percentage: 0,
        stageName: "Desteklenmiyor",
        stepIndex: 0,
        totalSteps: 5,
        statusText: "Desteklenmeyen dosya biçimi",
        isComplete: false,
        isFailed: true,
        variant: "unsupported",
      };
    default:
      return {
        percentage: 0,
        stageName: job.stage || "Bilinmiyor",
        stepIndex: 0,
        totalSteps: 5,
        statusText: "İşlem durumu bekleniyor",
        isComplete: false,
        isFailed: false,
        variant: "queued",
      };
  }
}

export function ocrStatus(job:ProcessingItem):string {
  if(job.hasOcr)return "Tamamlandı";
  if(job.stage==="OcrRequested")return "Sonuç bekleniyor";
  if(job.stage==="Failed")return job.failureCode?.toLowerCase().includes("ocr")?"Başarısız":"Tamamlanmadı";
  if(job.hasText)return "Metin doğrudan çıkarıldı";
  if(job.stage==="Unsupported")return "Uygulanamadı";
  return "Henüz sonuç yok";
}
