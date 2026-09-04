"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Barcode,
  Calendar,
  Check,
  CheckCircle2,
  FileCheck,
  FileText,
  HandCoins,
  MapPin,
  Printer,
  QrCode,
  Search,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkoutLoan } from "@/features/loans/api/checkout-loan";
import type { LoanDetailsItem } from "@/features/loans/model/loan";
import type { FolderListItem } from "@/features/physical-archive/model/folder";

export function CheckoutLoanWizard({
  availableFolders = [],
  onLoanCreated,
}: {
  availableFolders?: FolderListItem[];
  onLoanCreated: (newLoan: LoanDetailsItem) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isPending, setIsPending] = useState(false);

  // Form State
  const [selectedFolderId, setSelectedFolderId] = useState<string>(availableFolders[0]?.id ?? "");
  const selectedFolder = availableFolders.find((f) => f.id === selectedFolderId) ?? availableFolders[0];
  const [folderSearch, setFolderSearch] = useState("");

  // Personel Bilgileri
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerTitle, setBorrowerTitle] = useState("");
  const [borrowerUnit, setBorrowerUnit] = useState("");
  const [borrowerRegistryNo, setBorrowerRegistryNo] = useState("");
  const [borrowerPhone, setBorrowerPhone] = useState("0422 377 10 00 / 1420");

  // Gerekçe & Süre
  const [purposeCategory, setPurposeCategory] = useState("Mahkeme ve Dava Savunması");
  const [officialDocNo, setOfficialDocNo] = useState("E-94285142-640-1029");
  const [purposeDetail, setPurposeDetail] = useState("Açılan idari dava kapsamında savunma dilekçesi hazırlanması için dosya aslına ihtiyaç duyulmuştur.");
  const [loanDurationDays, setLoanDurationDays] = useState(15);
  
  // Hesaplanan iade tarihi
  const getDueDateString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const [dueDate, setDueDate] = useState(getDueDateString(15));

  function handleDaysChange(days: number) {
    setLoanDurationDays(days);
    setDueDate(getDueDateString(days));
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      setStep(1);
    }
  }

  async function handleCompleteCheckout() {
    if (!selectedFolder) {
      toast.error("Lütfen bir arşiv klasörü seçin.");
      return;
    }
    setIsPending(true);
    try {
      const res = await checkoutLoan({
        folderId: selectedFolder.id,
        borrowerSubjectId: `${borrowerName} (${borrowerUnit})`,
        purpose: `${purposeCategory}: ${purposeDetail}`,
        dueAt: `${dueDate}T17:00:00Z`,
      });

      const newLoanItem: LoanDetailsItem = {
        id: res.id,
        folderId: selectedFolder.id,
        folderBarcode: selectedFolder.barcode,
        folderTitle: selectedFolder.title,
        filePlanCode: selectedFolder.filePlanCode,
        borrowerSubjectId: `${borrowerName} (${borrowerUnit})`,
        purpose: `${purposeCategory} - ${purposeDetail}`,
        status: "Active",
        checkedOutAt: new Date().toISOString(),
        dueAt: `${dueDate}T17:00:00Z`,
        returnedAt: null,
        isOverdue: false,
        daysOverdue: 0,
      };

      onLoanCreated(newLoanItem);
      toast.success("Dosya başarıyla ödünç verildi ve teslim tutanağı oluşturuldu.");
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Ödünç işlemi sırasında hata oluştu.");
    } finally {
      setIsPending(false);
    }
  }

  
    const filteredFolders = availableFolders.filter(
    (f: FolderListItem) =>
      f.title.toLowerCase().includes(folderSearch.toLowerCase()) ||
      f.barcode.toLowerCase().includes(folderSearch.toLowerCase()) ||
      f.filePlanCode.includes(folderSearch)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" className="bg-primary text-primary-foreground font-semibold gap-1.5 shadow-xs hover:bg-primary/90">
            <HandCoins className="size-4" aria-hidden />
            <span>Yeni Ödünç Ver (Zimmet Başlat)</span>
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HandCoins className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Ödünç Verme Süreç Sihirbazı</DialogTitle>
              <DialogDescription className="text-xs">
                Fiziksel arşiv dosyasının zimmet teslim-tesellüm süreci ve yasal taahhüt kaydı.
              </DialogDescription>
            </div>
          </div>

          {/* 4 Aşamalı Süreç Göstergesi (Stepper) */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border mt-3 text-xs">
            {[
              { num: 1, label: "1. Dosya Seçimi" },
              { num: 2, label: "2. Personel / Birim" },
              { num: 3, label: "3. Gerekçe & Süre" },
              { num: 4, label: "4. Tutanak & Onay" },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-1.5 pb-1 border-b-2 font-semibold transition-all ${
                  step === s.num
                    ? "border-primary text-primary"
                    : step > s.num
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {step > s.num ? (
                  <Check className="size-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[10px]">
                    {s.num}
                  </span>
                )}
                <span className="truncate">{s.label}</span>
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Aşama 1: Dosya / Klasör Seçimi */}
        {step === 1 ? (
          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="folder-search">Arşiv Klasörü Barkodu veya Adı ile Ara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="folder-search"
                  value={folderSearch}
                  onChange={(e) => setFolderSearch(e.target.value)}
                  placeholder="Barkod (KLASOR-...) veya konu ara..."
                  className="pl-8.5 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredFolders.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  Ödünç verilebilecek uygun klasör bulunamadı. Lütfen önce Dosya İşlemleri modülünden klasör ekleyin.
                </div>
              ) : (
                filteredFolders.map((folder: FolderListItem) => {
                  const isSelected = selectedFolder?.id === folder.id;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`flex flex-col gap-1 rounded-xl border p-3 cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-primary">
                            {folder.barcode}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            SDP: {folder.filePlanCode}
                          </span>
                        </div>
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          Rafta Hazır
                        </span>
                      </div>

                      <p className="font-semibold text-foreground text-xs">{folder.title}</p>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                        <MapPin className="size-3 text-amber-500" />
                        <span>{folder.locationName || folder.locationCode}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Seçili Dosya Özeti */}
            {selectedFolder && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
                <FileCheck className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-foreground">Seçili Dosya: {selectedFolder.title}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Barkod: {selectedFolder.barcode} · Konum: {selectedFolder.locationName || selectedFolder.locationCode}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Aşama 2: Personel & Birim Bilgileri */}
        {step === 2 ? (
          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="borrower-name">Teslim Alan Personel (Ad Soyad)</Label>
                <Input
                  id="borrower-name"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  placeholder="Örn: Av. Selin Kaya"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="borrower-sicil">Kurum Sicil No / TCKN</Label>
                <Input
                  id="borrower-sicil"
                  value={borrowerRegistryNo}
                  onChange={(e) => setBorrowerRegistryNo(e.target.value)}
                  placeholder="SICIL-4819"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="borrower-unit">Görev Yaptığı Birim / Daire</Label>
                <select
                  id="borrower-unit"
                  value={borrowerUnit}
                  onChange={(e) => setBorrowerUnit(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="1. Hukuk Müşavirliği">1. Hukuk Müşavirliği</option>
                  <option value="İmar ve Şehircilik Dairesi">İmar ve Şehircilik Dairesi</option>
                  <option value="Ulaşım Hizmetleri Dairesi">Ulaşım Hizmetleri Dairesi</option>
                  <option value="Fen İşleri Dairesi">Fen İşleri Dairesi</option>
                  <option value="Mali Hizmetler Dairesi">Mali Hizmetler Dairesi</option>
                  <option value="Emlak ve İstimlak Dairesi">Emlak ve İstimlak Dairesi</option>
                  <option value="Teftiş Kurulu Başkanlığı">Teftiş Kurulu Başkanlığı</option>
                  <option value="Yazı İşleri ve Kararlar Dairesi">Yazı İşleri ve Kararlar Dairesi</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="borrower-title">Unvan / Görev</Label>
                <Input
                  id="borrower-title"
                  value={borrowerTitle}
                  onChange={(e) => setBorrowerTitle(e.target.value)}
                  placeholder="Hukuk Müşaviri, Şehir Plancısı, Mühendis..."
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="borrower-phone">İletişim / Kurum Dahili Telefonu</Label>
              <Input
                id="borrower-phone"
                value={borrowerPhone}
                onChange={(e) => setBorrowerPhone(e.target.value)}
                placeholder="Dahili: 1420 veya Cep No"
                required
              />
            </div>
          </div>
        ) : null}

        {/* Aşama 3: Gerekçe, Hukuki Dayanak & İade Taahhüdü */}
        {step === 3 ? (
          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="purpose-cat">Zimmet / Talep Kategorisi</Label>
                <select
                  id="purpose-cat"
                  value={purposeCategory}
                  onChange={(e) => setPurposeCategory(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="Mahkeme ve Dava Savunması">Mahkeme ve Dava Savunması</option>
                  <option value="Bilirkişi İncelemesi">Bilirkişi İncelemesi</option>
                  <option value="Sayıştay / Teftiş Denetimi">Sayıştay / Teftiş Denetimi</option>
                  <option value="Meclis / Encümen Komisyon İncelemesi">Meclis / Encümen Komisyon İncelemesi</option>
                  <option value="Birim İçi Teknik Proje Çalışması">Birim İçi Teknik Proje Çalışması</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-no">Resmi Talep Üst Yazı Sayısı</Label>
                <Input
                  id="doc-no"
                  value={officialDocNo}
                  onChange={(e) => setOfficialDocNo(e.target.value)}
                  placeholder="E-94285142-640-1029"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purpose-detail">Ayrıntılı Talep Gerekçesi</Label>
              <textarea
                id="purpose-detail"
                rows={3}
                value={purposeDetail}
                onChange={(e) => setPurposeDetail(e.target.value)}
                className="rounded-lg border border-border bg-card p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Dosyanın istenme nedeni, dava esas no veya kurul kararı detayı..."
              />
            </div>

            {/* İade Süresi Seçimi */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3">
              <Label className="font-bold">Ödünç Verme Süresi ve İade Taahhüt Tarihi</Label>
              <div className="flex items-center gap-2">
                {[
                  { days: 7, label: "7 Gün (Kısa)" },
                  { days: 15, label: "15 Gün (Standart)" },
                  { days: 30, label: "30 Gün (Uzun)" },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => handleDaysChange(item.days)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      loanDurationDays === item.days
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                <span className="text-muted-foreground font-medium">Son İade Tarihi:</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setLoanDurationDays(0);
                  }}
                  className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground"
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Aşama 4: Resmi Teslim-Tesellüm Tutanağı & Çift Nüsha Onay */}
        {step === 4 ? (
          <div className="flex flex-col gap-3 py-1 text-xs">
            {/* A4 Resmi Belge Önizlemesi */}
            <div className="rounded-xl border-2 border-slate-900 bg-white text-slate-900 p-5 shadow-sm font-sans flex flex-col gap-2.5">
              <div className="text-center border-b-2 border-slate-900 pb-2">
                <span className="font-black text-xs uppercase block">T.C. MALATYA BÜYÜKŞEHİR BELEDİYE BAŞKANLIĞI</span>
                <span className="font-extrabold text-[11px] block">ARŞİV VE DOKÜMANTASYON ŞUBE MÜDÜRLÜĞÜ</span>
                <span className="font-bold text-[10px] text-slate-600">ARŞİV BELGE / KLASÖR RESMİ TESLİM - TESELLÜM TUTANAĞI</span>
              </div>

              <div className="flex justify-between items-center text-[10px] border-b border-slate-200 pb-1.5 font-mono">
                <span>Tutanak No: <strong>TT-2026/0491</strong></span>
                <span>Tarih: <strong>{new Date().toLocaleDateString("tr-TR")}</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] py-1 border-b border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">Teslim Edilen Dosya:</span>
                  <strong>{selectedFolder.title}</strong>
                  <span className="font-mono block text-[10px] text-slate-700">Barkod: {selectedFolder.barcode} (SDP: {selectedFolder.filePlanCode})</span>
                  <strong>{selectedFolder?.title ?? "Seçilmedi"}</strong>
                  <span className="font-mono block text-[10px] text-slate-700">Barkod: {selectedFolder?.barcode ?? "—"} (SDP: {selectedFolder?.filePlanCode ?? "—"})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Teslim Alan Yetkili:</span>
                  <strong>{borrowerName}</strong> ({borrowerTitle})
                  <span className="block text-[10px] text-slate-700">{borrowerUnit} · Sicil: {borrowerRegistryNo}</span>
                </div>
              </div>

              <div className="text-[11px] py-1">
                <div>Gerekçe: <em>{purposeCategory} - {purposeDetail}</em></div>
                <div>Resmi Yazı: <span className="font-mono">{officialDocNo}</span></div>
                <div className="mt-1">
                  Son İade Tarihi: <strong className="text-red-700">{new Date(dueDate).toLocaleDateString("tr-TR")}</strong> ({loanDurationDays > 0 ? `${loanDurationDays} Gün Süreli` : "Özel Tarih"})
                </div>
              </div>

              <p className="text-[9px] text-slate-600 leading-relaxed border-t border-slate-200 pt-2 text-justify">
                Yukarıda dökümü yapılan arşiv dosyası, Devlet Arşiv Hizmetleri Hakkında Yönetmelik hükümleri gereğince
                eksiksiz ve hasarsız olarak teslim edilmiş olup, belirtilen sürede kurum arşivine iade edileceği,
                yetkisiz kişilerle paylaşılmayacağı ve gizliliğinin korunacağı taahhüt edilmiştir.
              </p>

              <div className="flex justify-between items-end pt-4 text-[10px]">
                <div className="flex flex-col items-center text-center">
                  <span className="font-bold">TESLİM EDEN</span>
                  <span>Ahmet YILMAZ</span>
                  <span className="text-[9px] text-slate-500">Arşiv Yetkilisi</span>
                </div>
                <div className="flex flex-col items-center">
                  <QrCode className="size-10 text-slate-900" />
                  <span className="font-mono text-[8px]">TT-2026-0491</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="font-bold">TESLİM ALAN</span>
                  <span>{borrowerName}</span>
                  <span className="text-[9px] text-slate-500">{borrowerUnit}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex items-center justify-between border-t border-border pt-3 mt-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as any)}
              disabled={isPending}
              className="gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              Geri
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              İptal
            </Button>
          )}

          {step < 4 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep((s) => (s + 1) as any)}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              İleri
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="size-3.5" />
                Yazdır
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCompleteCheckout}
                disabled={isPending}
                className="gap-1.5 bg-primary text-primary-foreground"
              >
                <Check className="size-3.5" />
                {isPending ? "Kaydediliyor…" : "Zimmeti Onayla & Teslim Et"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
