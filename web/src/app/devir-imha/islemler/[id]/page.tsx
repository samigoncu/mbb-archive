import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui/page";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getDisposition, getRetentionCase } from "@/features/retention/api/get-dispositions";
import { dispositionStatusLabels, type DispositionStatus } from "@/features/retention/model/disposition";
import { actionLabels } from "@/features/retention/model/retention";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { canOperate } from "@/features/retention/model/process-permissions";
import {
  ProcessStepForm,
  CommissionForm,
  CommissionDelegationForm,
  CreateTransferPackageForm,
  VerifyTransferPackageForm,
} from "@/features/retention/components/process-forms";
import { DispositionReceiptDialog } from "@/features/retention/components/disposition-receipt-dialog";
import {
  Gavel,
  ArrowLeft,
  FileText,
  Lock,
  Download,
  CheckCircle2,
  Users,
  ShieldCheck,
  Calendar,
} from "lucide-react";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [process, user] = await Promise.all([getDisposition(id), getCurrentUser()]);
  const retentionCase = await getRetentionCase(process.retentionCaseId);
  const held = retentionCase.activeHoldCount > 0;
  const subject = user?.subject;
  const independent = subject !== process.createdBy;
  const now = Date.now();
  const assigned = process.members.some((member) =>
    member.delegateSubject &&
    member.delegateFrom &&
    member.delegateUntil &&
    new Date(member.delegateFrom).getTime() <= now &&
    new Date(member.delegateUntil).getTime() >= now
      ? member.delegateSubject === subject
      : member.subject === subject,
  );
  const commissionActive =
    !!process.commissionValidFrom &&
    !!process.commissionValidUntil &&
    new Date(process.commissionValidFrom).getTime() <= now &&
    new Date(process.commissionValidUntil).getTime() >= now;
  const reviewed = process.reviews.some((review) => review.actor === subject);

  const isCompleted = process.status === "Completed";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`${actionLabels[process.action] ?? process.action} Değerlendirmesi`}
        description={`Referans: ${process.commissionReference || "Belirtilmemiş"} · Durum: ${
          dispositionStatusLabels[process.status as DispositionStatus] ?? process.status
        }`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/devir-imha/islemler"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}
            >
              <ArrowLeft className="size-3.5" />
              <span>İşlem Listesine Dön</span>
            </Link>
            {isCompleted && (
              <DispositionReceiptDialog
                process={process}
                triggerLabel="Resmi Tutanağı Görüntüle & Yazdır"
                triggerVariant="default"
                triggerSize="sm"
              />
            )}
          </div>
        }
      />

      {/* Gezinme Bağlantıları */}
      <nav aria-label="İlgili kayıtlar" className="flex flex-wrap gap-2 text-xs">
        <Link
          href={`/devir-imha/dosyalar/${process.retentionCaseId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-1.5 text-muted-foreground hover:text-foreground")}
        >
          <Gavel className="size-3.5 text-primary" />
          <span>Saklama ve Hukuki Bloke Dosyası</span>
        </Link>
        <Link
          href={`/documents/${process.documentId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-1.5 text-muted-foreground hover:text-foreground")}
        >
          <FileText className="size-3.5 text-primary" />
          <span>İlgili Belgeyi Aç</span>
        </Link>
      </nav>

      {/* İşlem Bilgisi Paneli */}
      <Panel padded title="İşlem Bilgisi ve Dayanak">
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Hazırlayan Personel</dt>
            <dd className="font-medium text-foreground mt-0.5">{process.createdBy}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Oluşturulma Tarihi</dt>
            <dd className="font-medium text-foreground mt-0.5">
              {new Date(process.createdAt).toLocaleString("tr-TR")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Değerlendirme Gerekçesi</dt>
            <dd className="mt-1 whitespace-pre-wrap text-foreground bg-muted/20 p-3 rounded-lg border border-border leading-relaxed">
              {process.reason}
            </dd>
          </div>
        </dl>
      </Panel>

      {/* Bloke Uyarısı */}
      {held && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive"
        >
          <Lock className="size-4 shrink-0" />
          <span>
            Bu dosyada <strong>{retentionCase.activeHoldCount} etkin hukuki bloke</strong> bulunmaktadır.
            Değerlendirme, nihai onay ve teslim işlemleri mevzuat gereği bloke kalkana kadar durdurulmuştur.
          </span>
        </div>
      )}

      {/* Komisyon Görevlendirmesi */}
      <Panel padded title="Komisyon Heyeti ve Görevlendirme">
        {process.members.length ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              <strong>Görev Süresi:</strong>{" "}
              {new Date(process.commissionValidFrom!).toLocaleString("tr-TR")} –{" "}
              {new Date(process.commissionValidUntil!).toLocaleString("tr-TR")}
            </p>
            <ul className="space-y-1.5 text-xs">
              {process.members.map((member) => (
                <li
                  key={member.subject}
                  className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 border border-border"
                >
                  <Users className="size-3.5 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{member.subject}</span>
                  {member.delegateSubject && (
                    <span className="text-muted-foreground">
                      (Vekil: <strong>{member.delegateSubject}</strong> · Ref: {member.delegationReference} ·{" "}
                      {new Date(member.delegateFrom!).toLocaleDateString("tr-TR")} –{" "}
                      {new Date(member.delegateUntil!).toLocaleDateString("tr-TR")})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Komisyon üyeleri ve görev süresi henüz tanımlanmamış.
          </p>
        )}

        {canOperate(user, "retention.commissions.manage") &&
          ["Draft", "UnderReview", "PendingApproval"].includes(process.status) && (
            <div className="mt-4 pt-3 border-t border-border">
              <CommissionForm process={process} />
            </div>
          )}

        {canOperate(user, "retention.commissions.manage") &&
          ["Draft", "UnderReview"].includes(process.status) &&
          process.members.length > 0 && (
            <details className="mt-3 rounded-lg border border-border bg-card p-3">
              <summary className="cursor-pointer text-xs font-semibold text-primary">
                Süreli vekâlet tanımla
              </summary>
              <div className="mt-3">
                <CommissionDelegationForm process={process} />
              </div>
            </details>
          )}
      </Panel>

      {/* Dijital Devir Paketi (Transfer Kararı İçin) */}
      {process.action === "Transfer" && ["Approved", "Completed"].includes(process.status) && (
        <Panel padded title="Dijital Devir Paketi">
          {process.transferPackageId ? (
            <div className="space-y-3 text-xs">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground block">Paket Kimliği:</span>
                  <span className="font-mono">{process.transferPackageId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Paket Boyutu:</span>
                  <span className="font-medium">
                    {((process.transferPackageSize ?? 0) / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block">Paket SHA-256:</span>
                  <span className="font-mono break-all text-[11px] text-foreground">
                    {process.transferPackageSha256}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {canOperate(user, "retention.export") && (
                  <Link
                    href={`/devir-imha/islemler/${id}/paket`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}
                  >
                    <Download className="size-3.5" />
                    <span>Devir Paketini İndir (ZIP)</span>
                  </Link>
                )}
              </div>

              {process.packageVerifiedAt && (
                <p className="text-xs text-emerald-600 font-medium pt-1">
                  Doğrulayan: {process.packageVerifiedBy} ·{" "}
                  {new Date(process.packageVerifiedAt).toLocaleString("tr-TR")}
                </p>
              )}

              {!held &&
                process.status === "Approved" &&
                independent &&
                subject !== process.approvedBy &&
                canOperate(user, "retention.transfers.accept") && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <VerifyTransferPackageForm process={process} />
                  </div>
                )}
            </div>
          ) : !held && canOperate(user, "retention.export") && process.status === "Approved" ? (
            <CreateTransferPackageForm process={process} />
          ) : (
            <p className="text-xs text-muted-foreground">Devir paketi hazırlanması bekleniyor.</p>
          )}
        </Panel>
      )}

      {/* Komisyon Görüşleri */}
      <Panel
        padded
        title={`Komisyon Görüşleri (${process.reviews.length}/${process.requiredReviews})`}
      >
        {process.reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground">Henüz komisyon görüşü kaydedilmedi.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {process.reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{review.actor}</span>
                  <Badge variant={review.approved ? "success" : "destructive"} className="text-[10px]">
                    {review.approved ? "Uygun (Onay)" : "Uygun Değil (Red)"}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-muted-foreground">{review.reason}</p>
                <time className="text-[10px] text-muted-foreground block pt-1">
                  {new Date(review.reviewedAt).toLocaleString("tr-TR")}
                </time>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {/* Sonraki İşlem / Adım Formu */}
      {!held && (
        <Panel padded title="Sıradaki İşlem Adımı">
          {process.status === "Draft" &&
            (subject === process.createdBy && commissionActive && canOperate(user, "retention.disposition.prepare") ? (
              <ProcessStepForm
                process={process}
                operation="submit"
                label="Komisyon Değerlendirmesine Gönder"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Taslağı hazırlayan personelin komisyona göndermesi bekleniyor.
              </p>
            ))}

          {process.status === "UnderReview" &&
            (independent && assigned && commissionActive && !reviewed && canOperate(user, "retention.disposition.review") ? (
              <ProcessStepForm
                process={process}
                operation="reviews"
                label="Komisyon Görüşümü Kaydet"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Yetkili diğer komisyon üyelerinin bağımsız görüş bildirmesi bekleniyor.
              </p>
            ))}

          {process.status === "PendingApproval" &&
            (independent && commissionActive && !reviewed && canOperate(user, "retention.disposition.approve") ? (
              <ProcessStepForm
                process={process}
                operation="approve"
                label="Nihai Onayı Kaydet"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Hazırlayan ve komisyon üyelerinden bağımsız bir üst yetkilinin nihai onayı bekleniyor.
              </p>
            ))}

          {process.status === "Approved" && (
            <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  Fiziksel Komisyon ve Heyet Tutanak Formu
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  İşlemi uygulamadan önce heyet üyelerinin ve şahitlerin ıslak/elektronik imzasını almak için Tutanak Formunu yazdırabilirsiniz.
                </p>
              </div>
              <DispositionReceiptDialog
                process={process}
                triggerLabel="Tutanak Formunu Yazdır"
                triggerVariant="outline"
                triggerSize="sm"
              />
            </div>
          )}

          {process.status === "Approved" &&
            process.action === "Transfer" &&
            (independent &&
            subject !== process.approvedBy &&
            process.packageVerifiedBy === subject &&
            !!process.packageVerifiedAt &&
            canOperate(user, "retention.transfers.accept") ? (
              <ProcessStepForm
                process={process}
                operation="accept-transfer"
                label="Arşiv Devrini Teslim Aldım (Tutanakla Kapat)"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Alıcı arşiv biriminin teslim alma ve doğrulama tutanağı bekleniyor.
              </p>
            ))}

          {process.status === "Approved" &&
            process.action === "KeepPermanent" &&
            (canOperate(user, "retention.disposition.execute") ? (
              <ProcessStepForm
                process={process}
                operation="keep-permanently"
                label="Kalıcı Saklama Kararını Uygula"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Kalıcı saklama kararını uygulayacak yetkili bekleniyor.
              </p>
            ))}

          {process.status === "Approved" &&
            process.action === "Destroy" &&
            (independent && subject !== process.approvedBy && canOperate(user, "retention.disposition.execute") ? (
              <ProcessStepForm
                process={process}
                operation="execute-destruction"
                label="Fiziksel İmha Kanıtını Kaydet (Dijital Asıllar Korunur)"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                İmha kararını yürütecek yetkili bekleniyor (hazırlayan ve onaylayandan bağımsız olmalıdır).
              </p>
            ))}

          {process.status === "Rejected" && (
            <p className="text-xs text-destructive">
              Komisyon işlemi reddetti. Gerekçeyi değerlendirerek saklama dosyasından yeni bir taslak açabilirsiniz.
            </p>
          )}

          {process.status === "Completed" && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="size-4" />
              <span>İşlem süreci başarıyla tamamlanmış ve resmi tutanak kaydı oluşturulmuştur.</span>
            </div>
          )}
        </Panel>
      )}

      {/* Tamamlanma & Tutanak Paneli */}
      {process.completedAt && (
        <Panel
          padded
          title={process.action === "Destroy" ? "Fiziksel İmha Tutanağı" : "Devir & Teslim Tutanağı"}
        >
          <div className="space-y-3 text-xs">
            <p>
              <strong>Tamamlayan Yetkili:</strong> {process.completedBy} ·{" "}
              <strong>Kurum / Referans:</strong>{" "}
              {process.action === "Destroy"
                ? "Fiziksel İmha Tutanağı"
                : process.receivingArchive ?? "Kurum Arşivi"}{" "}
              ({process.receiptReference})
            </p>
            <p className="text-muted-foreground">
              İşlem Tarihi: {new Date(process.completedAt).toLocaleString("tr-TR")}
            </p>

            {process.executionEvidenceDocumentId && (
              <div className="rounded-lg bg-muted/20 p-3 border border-border space-y-1">
                <Link
                  href={`/documents/${process.executionEvidenceDocumentId}`}
                  className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  <FileText className="size-3.5" />
                  <span>Dayanak Tutanak Belgesini İncele</span>
                </Link>
                <p>Yöntem: {process.executionMethod} · Yer: {process.executionLocation}</p>
                <p className="whitespace-pre-wrap">Tanıklar: {process.executionWitnesses}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Kanıt SHA-256: {process.executionEvidenceSha256}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <DispositionReceiptDialog
                process={process}
                triggerLabel="Resmi Tutanağı Görüntüle ve Yazdır"
                triggerVariant="default"
              />
              {canOperate(user, "retention.export") && (
                <a
                  href={`/devir-imha/islemler/${id}/tutanak`}
                  download={`arsiv-tutanagi-${id}.json`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                >
                  <Download className="size-3.5" />
                  <span>JSON İndir</span>
                </a>
              )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
