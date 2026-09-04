"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileStack,
  HandCoins,
  History,
  Printer,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckoutLoanWizard } from "./checkout-loan-wizard";
import { InspectionReturnDialog } from "./inspection-return-dialog";
import { ExtendLoanDialog } from "./extend-loan-dialog";
import { LoanReceiptModal } from "./loan-receipt-modal";
import type { LoanDetailsItem } from "@/features/loans/model/loan";

export function LoanProcessManager({
  initialLoans,
}: {
  initialLoans: LoanDetailsItem[];
}) {
  const [loans, setLoans] = useState<LoanDetailsItem[]>(initialLoans);
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

  function handleSendNotice(loan: LoanDetailsItem) {
    toast.success(`'${loan.borrowerSubjectId}' personeline resmi iade ihtar bildirimi gönderildi.`);
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

          <CheckoutLoanWizard onLoanCreated={handleLoanCreated} />
        </div>
      </div>

      {/* Zimmet Tablosu */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-bold uppercase text-[10px] text-muted-foreground tracking-wider">
              <tr>
                <th className="p-3">Dosya Bilgisi & Barkod</th>
                <th className="p-3">Teslim Alan Personel</th>
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
                    <span className="font-bold text-foreground block">{loan.borrowerSubjectId}</span>
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

                      {loan.status !== "Returned" ? (
                        <>
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
