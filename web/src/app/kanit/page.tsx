import Link from "next/link";
import { LifecycleNavigation } from "@/features/retention/components/lifecycle-navigation";
import { ShieldAlert } from "lucide-react";
import { Notice, PageHeader } from "@/components/ui/page";
import {
  getEvidenceCapabilities,
  getEvidenceValidations,
} from "@/features/evidence/api/get-evidence";
import { PdfValidationForm } from "@/features/evidence/components/pdf-validation-form";
import { CmsValidationForm } from "@/features/evidence/components/cms-validation-form";
import {
  EvidenceCapabilityPanel,
  EvidenceValidationTable,
} from "@/features/evidence/components/evidence-overview";

export const metadata = { title: "Kanıt & İmza" };

export default async function KanitPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  let historyError = false;
  const [capabilities, validations] = await Promise.all([
    getEvidenceCapabilities(),
    getEvidenceValidations(page, {}, 50).catch(() => { historyError = true; return ({
      items: [],
      page: 1,
      pageSize: 50,
      totalCount: 0,
    }); }),
  ]);

  // TSA adresi yapılandırılmadıysa zaman damgası alınamaz; yetenek tablosu
  // bunu olduğu gibi gösterir.
  const timestampAuthorityConfigured = capabilities?.timestampAuthorityConfigured === true;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Kanıt ve İmza"
        description="Elektronik imza, zaman damgası ve imzalı belge doğrulamalarının yürütüldüğü ve kayıt altına alındığı ekran."
      />
      <LifecycleNavigation active="/kanit" />

      {!capabilities?.pdfPadesConfigured && <Notice icon={ShieldAlert} tone="warning">PDF imza doğrulama sağlayıcısı henüz yapılandırılmadı. CMS ve zaman damgası doğrulama yetenekleri aşağıda ayrı gösterilir.</Notice>}
      <PdfValidationForm configured={capabilities?.pdfPadesConfigured === true} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <EvidenceCapabilityPanel
          capabilities={capabilities}
          timestampAuthorityConfigured={timestampAuthorityConfigured}
        />

        <CmsValidationForm
          maxBytes={capabilities?.maxInlineDecodedBytes ?? 33554432}
        />
      </div>

      {historyError ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">Doğrulama geçmişi yüklenemedi. Sayfayı yenileyerek tekrar deneyin.</p> : <EvidenceValidationTable
        validations={validations.items}
        totalCount={validations.totalCount}
      />}
      {!historyError && <nav aria-label="Doğrulama geçmişi sayfaları" className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Sayfa {page} / {Math.max(1, Math.ceil(validations.totalCount / 50))}</span><div className="flex gap-4">{page > 1 && <Link href={`/kanit?page=${page-1}`}>Önceki</Link>}{page * 50 < validations.totalCount && <Link href={`/kanit?page=${page+1}`}>Sonraki</Link>}</div></nav>}
    </div>
  );
}
