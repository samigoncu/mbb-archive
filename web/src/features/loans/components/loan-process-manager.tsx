"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileStack,
  HandCoins,
  History,
  MapPin,
  Printer,
  Search,
  Send,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckoutLoanWizard } from "./checkout-loan-wizard";
import { InspectionReturnDialog } from "./inspection-return-dialog";
import { ExtendLoanDialog } from "./extend-loan-dialog";
import { LoanReceiptModal } from "./loan-receipt-modal";
import { TransferCustodyDialog } from "./transfer-custody-dialog";
import { CustodyChainDialog } from "./custody-chain-dialog";
import type { CustodyTransferRecord, LoanDetailsItem } from "@/features/loans/model/loan";
import type { FolderListItem } from "@/features/physical-archive/model/folder";

const DEFAULT_DEMO_LOANS: LoanDetailsItem[] = [
  {
    id: "loan-101",
    folderId: "folder-1",
    folderBarcode: "KLASOR-2024-0012",
    folderTitle: "Malatya Trambüs Güzergahı Genişletme Projesi İhale ve Hakediş Dosyası",
    filePlanCode: "040.03/782",
    borrowerSubjectId: "Ahmet YILMAZ (Ulaşım Planlama Şb.)",
    currentHolder: "Veyis AYDEMİR (1. Hukuk Müşavirliği)",
    currentLocation: "Hukuk Müşavirliği Kat: 3 Oda: 308",
    custodyChain: [
      {
        id: "chain-1",
        fromUser: "Ahmet YILMAZ (Ulaşım Planlama Şb.)",
        toUser: "Veyis AYDEMİR (1. Hukuk Müşavirliği)",
        transferredAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        reason: "Duruşma hazırlığı ve ortak hukuki savunma mütalaası için dosya devredilmiştir.",
        location: "Hukuk Müşavirliği Kat: 3 Oda: 308",
        officialDocNo: "E-94285142-640-1092",
      },
    ],
    purpose: "Mahkeme ve Dava Savunması: İdari Mahkeme 2024/418E sayılı dosya",
    status: "Active",
    checkedOutAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    dueAt: new Date(Date.now() + 8 * 86400000).toISOString(),
    returnedAt: null,
    isOverdue: false,
    daysOverdue: 0,
  },
  {
    id: "loan-102",
    folderId: "folder-2",
    folderBarcode: "KLASOR-2024-0045",
    folderTitle: "Yeşilyurt Bölgesi İmar Planı Revizyonu ve Parselasyon Dosyaları",
    filePlanCode: "115.01.02/104",
    borrowerSubjectId: "Mehmet KAYA (İmar ve Şehircilik Dairesi)",
    currentHolder: "Fatma ŞAHİN (Harita ve CBS Şb.)",
    currentLocation: "Harita Şb. Kat: 2 Oda: 215",
    custodyChain: [
      {
        id: "chain-2",
        fromUser: "Mehmet KAYA (İmar ve Şehircilik Dairesi)",
        toUser: "Ali ÇELİK (Fen İşleri Dairesi)",
        transferredAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        reason: "Yol kotu ve altyapı çakışma tespiti için inceleme devri",
        location: "Fen İşleri Kat: 1 Oda: 102",
      },
      {
        id: "chain-3",
        fromUser: "Ali ÇELİK (Fen İşleri Dairesi)",
        toUser: "Fatma ŞAHİN (Harita ve CBS Şb.)",
        transferredAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        reason: "Kamulaştırma ve mülkiyet sınır haritası aplikasyonu için zincirleme devir",
        location: "Harita Şb. Kat: 2 Oda: 215",
        officialDocNo: "E-812039-601/44",
      },
    ],
    purpose: "Birim İçi Teknik Proje Çalışması: Parselasyon ve yol düzenlemesi",
    status: "Active",
    checkedOutAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    dueAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    returnedAt: null,
    isOverdue: false,
    daysOverdue: 0,
  },
  {
    id: "loan-103",
    folderId: "folder-3",
    folderBarcode: "KLASOR-2024-0089",
    folderTitle: "Büyükşehir Hizmet Binası Güçlendirme ve Yapım Sözleşmesi",
    filePlanCode: "750.01/45",
    borrowerSubjectId: "Zeynep DEMİR (Fen İşleri Dairesi)",
    currentHolder: "Zeynep DEMİR (Fen İşleri Dairesi)",
    currentLocation: "Fen İşleri Binası Kat: 2 Oda: 204",
    custodyChain: [],
    purpose: "Sayıştay / Teftiş Denetimi: 2024 Hakediş ve kabul tutanakları",
    status: "Active",
    checkedOutAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    dueAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    returnedAt: null,
    isOverdue: true,
    daysOverdue: 3,
  },
  {
    id: "loan-104",
    folderId: "folder-4",
    folderBarcode: "KLASOR-2023-0190",
    folderTitle: "2023 Mali Yılı Sayıştay İnceleme ve Denetim Dosyası",
    filePlanCode: "840.02/12",
    borrowerSubjectId: "Mustafa ŞEN (Mali Hizmetler Dairesi)",
    currentHolder: "Mustafa ŞEN (Mali Hizmetler Dairesi)",
    currentLocation: "Arşiv Rafı B-04-2",
    custodyChain: [],
    purpose: "Sayıştay İncelemesi: Kesin hesap raporu",
    status: "Returned",
    checkedOutAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    dueAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    returnedAt: new Date(Date.now() - 41 * 86400000).toISOString(),
    isOverdue: false,
    daysOverdue: 0,
  },
];

export function LoanProcessManager({
  initialLoans,
  availableFolders = [],
}: {
  initialLoans: LoanDetailsItem[];
  availableFolders?: FolderListItem[];
}) {
  const [loans, setLoans] = useState<LoanDetailsItem[]>(
    initialLoans && initialLoans.length > 0 ? initialLoans : DEFAULT_DEMO_LOANS
  );
  const [activeTab, setActiveTab] = useState<"all" | "active" | "overdue" | "returned">("active");
  const [search, setSearch] = useState("");
  const [receiptLoan, setReceiptLoan] = useState<LoanDetailsItem | null>(null);

  // Filtreler
  const filteredLoans = useMemo(() => {
    let list = loans;
    if (activeTab === "active") list = list.filter((l) => l.status === "Active");
    if (activeTab === "overdue") list = list.filter((l) => l.isOverdue && l.status !== "Returned");
    if (activeTab === "returned") list = list.filter((l) => l.status === "Returned");

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.folderBarcode.toLowerCase().includes(q) ||
          l.folderTitle.toLowerCase().includes(q) ||
          l.borrowerSubjectId.toLowerCase().includes(q) ||
          (l.currentHolder && l.currentHolder.toLowerCase().includes(q)) ||
          l.purpose.toLowerCase().includes(q)
      );
    }
    return list;
  }, [loans, activeTab, search]);

  const activeCount = loans.filter((l) => l.status === "Active").length;
  const overdueCount = loans.filter((l) => l.isOverdue && l.status !== "Returned").length;
  const returnedCount = loans.filter((l) => l.status === "Returned").length;

  function handleLoanCreated(newLoan: LoanDetailsItem) {
    setLoans((prev) => [newLoan, ...prev]);
    setActiveTab("active");
  }

  function handleReturned(loanId: string) {
    setLoans((prev) =>
      prev.map((l) =>
        l.id === loanId
          ? {
              ...l,
              status: "Returned",
              returnedAt: new Date().toISOString(),
              isOverdue: false,
              daysOverdue: 0,
            }
          : l
      )
    );
  }

  function handleExtended(loanId: string, newDueDate: string) {
    setLoans((prev) =>
      prev.map((l) =>
        l.id === loanId
          ? {
              ...l,
              dueAt: newDueDate,
              isOverdue: false,
              daysOverdue: 0,
            }
          : l
      )
    );
  }

  function handleCustodyTransferred(
    loanId: string,
    record: CustodyTransferRecord,
    newHolder: string,
    newLocation: string,
    newDueAt?: string
  ) {
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id !== loanId) return l;
        return {
          ...l,
          currentHolder: newHolder,
          currentLocation: newLocation,
          dueAt: newDueAt || l.dueAt,
          custodyChain: [...(l.custodyChain || []), record],
        };
      })
    );
  }

  function handleSendNotice(loan: LoanDetailsItem) {
    const target = loan.currentHolder || loan.borrowerSubjectId;
    toast.success(`'${target}' personeline resmi iade ihtar bildirimi gönderildi.`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Üst Süreç Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Aktif Zimmetler
            </span>
            <h3 className="text-2xl font-black text-foreground mt-1">{activeCount} Dosya</h3>
            <span className="text-[10px] text-muted-foreground">Birimlerde inceleniyor</span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <FileStack className="size-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Süresi Geçenler
            </span>
            <h3 className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
              {overdueCount} Dosya
            </h3>
            <span className="text-[10px] text-red-600/80">Acil iade ihtarı gerekli</span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
            <AlertTriangle className="size-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              İade Alınanlar
            </span>
            <h3 className="text-2xl font-black text-foreground mt-1">{returnedCount} Dosya</h3>
            <span className="text-[10px] text-emerald-600">Kontrollü rafa kaldırıldı</span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Toplam Dolaşım
            </span>
            <h3 className="text-2xl font-black text-foreground mt-1">{loans.length} Kayıt</h3>
            <span className="text-[10px] text-muted-foreground">Zimmet tutanağı mevcut</span>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HandCoins className="size-5" />
          </div>
        </div>
      </div>

      {/* Araç Çubuğu: Filtreler, Arama ve Sihirbaz Butonu */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "active", label: `Zimmette (${activeCount})` },
            { key: "overdue", label: `Süresi Geçen (${overdueCount})` },
            { key: "returned", label: `İade Alınan (${returnedCount})` },
            { key: "all", label: `Tümü (${loans.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Dosya barkodu veya personel ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 w-48 sm:w-64 rounded-lg border border-border bg-background pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <CheckoutLoanWizard availableFolders={availableFolders} onLoanCreated={handleLoanCreated} />
        </div>
      </div>

      {/* Zimmet Tablosu */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-bold uppercase text-[10px] text-muted-foreground tracking-wider">
              <tr>
                <th className="p-3">Dosya Bilgisi & Barkod</th>
                <th className="p-3">Zimmet Sahibi (İlk / En Son Kimde & Nerede)</th>
                <th className="p-3">Talep Gerekçesi</th>
                <th className="p-3">Veriliş Tarihi</th>
                <th className="p-3">Son İade Tarihi & Durum</th>
                <th className="p-3 text-right">Süreç İşlemleri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex flex-col max-w-xs">
                      <Link
                        href={`/dosya-islemleri?barcode=${encodeURIComponent(loan.folderBarcode)}`}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        {loan.folderBarcode}
                      </Link>
                      <span className="font-semibold text-foreground truncate mt-0.5">
                        {loan.folderTitle}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        SDP: {loan.filePlanCode}
                      </span>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex flex-col gap-1 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <User className="size-3 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground text-xs">
                          {loan.borrowerSubjectId}
                        </span>
                        {loan.custodyChain && loan.custodyChain.length > 0 && (
                          <span className="text-[9px] text-muted-foreground">(İlk Alan)</span>
                        )}
                      </div>

                      {loan.currentHolder && loan.currentHolder !== loan.borrowerSubjectId ? (
                        <div className="flex flex-col gap-0.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 p-1.5 mt-0.5 shadow-2xs">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                            <ArrowRight className="size-3 text-indigo-500 shrink-0" />
                            <span>En Son Kimde: {loan.currentHolder}</span>
                          </div>
                          {loan.currentLocation && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-4">
                              <MapPin className="size-2.5 text-amber-600 shrink-0" />
                              <span className="truncate">{loan.currentLocation}</span>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {loan.custodyChain && loan.custodyChain.length > 0 && (
                        <CustodyChainDialog
                          loan={loan}
                          trigger={
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline w-fit mt-0.5"
                            >
                              <span>⛓️ {loan.custodyChain.length} Kez Devredildi (Zincirleme Zimmet)</span>
                            </button>
                          }
                        />
                      )}
                    </div>
                  </td>

                  <td className="p-3 max-w-xs">
                    <p className="text-muted-foreground truncate" title={loan.purpose}>
                      {loan.purpose}
                    </p>
                  </td>

                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {new Date(loan.checkedOutAt).toLocaleDateString("tr-TR")}
                  </td>

                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-foreground">
                        {new Date(loan.dueAt).toLocaleDateString("tr-TR")}
                      </span>
                      {loan.status === "Returned" ? (
                        <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 w-fit text-[10px]">
                          ✓ İade Alındı ({loan.returnedAt ? new Date(loan.returnedAt).toLocaleDateString("tr-TR") : ""})
                        </Badge>
                      ) : loan.isOverdue ? (
                        <Badge variant="destructive" className="w-fit text-[10px] gap-1">
                          <AlertTriangle className="size-2.5" />
                          {loan.daysOverdue > 0 ? `${loan.daysOverdue} gün gecikti` : "Süresi Doldu"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 w-fit text-[10px] gap-1">
                          <Clock className="size-2.5" />
                          Zimmette
                        </Badge>
                      )}
                    </div>
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Resmi Teslim Tutanağı Görüntüle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setReceiptLoan(loan)}
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title="Resmi Teslim-Tesellüm Tutanağını Görüntüle / Yazdır"
                      >
                        <Printer className="size-3.5" />
                      </Button>

                      {/* Zincirleme Zimmet Geçmişi */}
                      {loan.custodyChain && loan.custodyChain.length > 0 && (
                        <CustodyChainDialog loan={loan} />
                      )}

                      {loan.status !== "Returned" ? (
                        <>
                          {/* Zimmet Devret (Kurum İçi Zincirleme Devir) */}
                          <TransferCustodyDialog
                            loan={loan}
                            onTransferred={handleCustodyTransferred}
                          />

                          {/* Süre Uzat */}
                          <ExtendLoanDialog loan={loan} onExtended={handleExtended} />

                          {/* İhtar Gönder (Gecikmişse) */}
                          {loan.isOverdue ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendNotice(loan)}
                              className="text-red-600 hover:bg-red-500/10 text-xs gap-1"
                              title="Resmi İade İhtarı Gönder"
                            >
                              <Bell className="size-3" />
                              <span>İhtar</span>
                            </Button>
                          ) : null}

                          {/* Kontrollü İade Al */}
                          <InspectionReturnDialog loan={loan} onReturned={handleReturned} />
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-muted-foreground">
                    <HandCoins className="size-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-foreground">Kayıt Bulunamadı</p>
                    <p className="mt-1 text-[11px]">Seçili filtreye uyan bir ödünç/zimmet kaydı bulunmuyor.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teslim-Tesellüm Tutanağı Modal */}
      <LoanReceiptModal
        loan={receiptLoan}
        isOpen={Boolean(receiptLoan)}
        onClose={() => setReceiptLoan(null)}
      />
    </div>
  );
}
