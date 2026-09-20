import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Notice, PageHeader, Panel } from "@/components/ui/page";
import { getSubjectVisibility } from "@/features/access/api/get-grants";
import {
  permissionLabels,
  resourceTypeLabels,
  subjectTypeLabels,
  type SubjectVisibility,
} from "@/features/access/model/grants";

export const metadata = { title: "Kullanıcı Görünürlüğü" };

/**
 * "Bu kullanıcı neyi görüyor?" raporu. Yetkilendirme kurulduktan sonra en sık
 * sorulan soru budur; cevabı üç ayrı yerde durur (birim üyeliği, rol izinleri,
 * paylaşımlar) ve bu ekran üçünü yan yana koyar.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const managementHub = params.tab === "visibility";
  const subject = params.subject?.trim() ?? "";

  let report: SubjectVisibility | null = null;
  let error: string | null = null;

  if (subject) {
    try {
      report = await getSubjectVisibility(subject);
    } catch {
      error =
        "Rapor alınamadı. Kullanıcı kimliğini kontrol edin veya yetkinizin yeterli olduğundan emin olun.";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Kullanıcı Görünürlüğü"
        description="Bir kullanıcının hangi birimleri, hangi izinleri ve hangi paylaşımları taşıdığını gösterir."
      />

      <Panel padded>
        <form method="get" className="flex flex-wrap items-end gap-3">
          {managementHub && <input type="hidden" name="tab" value="visibility" />}
          <label className="min-w-[18rem] flex-1 text-sm">
            Kullanıcı kimliği (subject)
            <Input name="subject" defaultValue={subject} className="mt-1" required />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Raporu getir
          </button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Kimlik, kurumun kimlik sağlayıcısındaki değişmez kullanıcı kimliğidir —
          görünen ad değil.
        </p>
      </Panel>

      {error && <Notice>{error}</Notice>}

      {report && (
        <>
          <Panel title="Özet" padded>
            {report.developmentBootstrapActive && (
              <Notice>
                Bu ortam geliştirme kimliğiyle çalışıyor: geliştirme rolü tüm
                izinleri karşılar ve veritabanında durmaz. Aşağıdaki rapor
                yalnız tanımlı rolleri, birimleri ve paylaşımları gösterir.
              </Notice>
            )}
            {report.unrestricted ? (
              <Notice>
                Bu kullanıcı kapsam üstü okuma izni taşıyor: birim süzgeci
                uygulanmaz, arşivin tamamını görür.
              </Notice>
            ) : report.seesNothing ? (
              <Notice>
                Bu kullanıcı hiçbir belge görmüyor: birim üyeliği ve paylaşımı
                yok. Bir birime üye yapılmadan arşiv boş görünür.
              </Notice>
            ) : (
              <p className="text-sm">
                {report.units.length} birim üyeliği ve {report.activeGrants} açık paylaşım
                üzerinden görüyor.
              </p>
            )}

            {!report.groupGrantsResolved && (
              <p className="mt-3 text-xs text-muted-foreground">
                Not: Dizin grubu üyelikleri yalnız kullanıcının kendi oturum
                jetonunda bulunur. Grup üzerinden verilmiş paylaşımlar bu raporda
                görünmez; kullanıcı onları yine de görebilir.
              </p>
            )}
          </Panel>

          <Panel title={`Birimler (${report.units.length})`} padded>
            {report.units.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Birim üyeliği yok.
              </p>
            ) : (
              <ul className="divide-y">
                {report.units.map((unit) => (
                  <li key={unit.id} className="py-3 text-sm">
                    <p className="font-medium">
                      {unit.name} <span className="text-muted-foreground">({unit.code})</span>
                      {unit.isPrimary && " · birincil birim"}
                      {!unit.isActive && " · pasif"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {unit.path}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Alt birimler de kapsanır: bir daire başkanlığına üye olan kullanıcı
              şubelerinin evrakını da görür.
            </p>
          </Panel>

          <Panel title={`İzinler (${report.permissions.length})`} padded>
            {report.permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rol ataması yok.</p>
            ) : (
              <p className="font-mono text-xs">{report.permissions.join(" · ")}</p>
            )}
          </Panel>

          <Panel title={`Paylaşımlar (${report.activeGrants} açık / ${report.grants.length} kayıt)`} padded>
            {report.grants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Birim sınırını aşan paylaşım yok.
              </p>
            ) : (
              <ul className="divide-y">
                {report.grants.map((grant) => (
                  <li key={grant.id} className="py-3 text-sm">
                    <p className="font-medium">
                      {resourceTypeLabels[
                        grant.resourceType as keyof typeof resourceTypeLabels
                      ] ?? grant.resourceType}
                      : {grant.resourceKey}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {subjectTypeLabels[
                        grant.subjectType as keyof typeof subjectTypeLabels
                      ] ?? grant.subjectType}
                      {" · "}
                      {permissionLabels[
                        grant.permission as keyof typeof permissionLabels
                      ] ?? grant.permission}
                      {" · "}
                      {grant.isActive ? "açık" : "kapalı"}
                      {" · veren: "}
                      {grant.grantedBy}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/tanimlamalar/paylasimlar"
              className="mt-4 inline-block text-sm text-primary underline"
            >
              Paylaşım yönetimine git
            </Link>
          </Panel>
        </>
      )}
    </div>
  );
}
