"use client";

import { useState } from "react";
import {
  FileText,
  Printer,
  ShieldCheck,
  Building2,
  Users,
  FolderTree,
  Calendar,
  CheckCircle2,
  GitBranch,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  OrganizationUnit,
  UnitMember,
  UnitPlanDetails,
} from "../model/unit-plans";

export function UnitRecordDialog({
  unit,
  members,
  details,
  parentUnitName,
  triggerLabel = "Teşkilat Tutanağı",
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  unit: OrganizationUnit;
  members: UnitMember[];
  details: UnitPlanDetails;
  parentUnitName?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);

  const todayFormatted = new Date().toLocaleDateString("tr-TR", {
    dateStyle: "long",
  });

  const primaryMembersCount = members.filter((m) => m.isPrimary).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className="gap-1.5 text-xs font-medium shadow-xs"
          />
        }
      >
        <FileText className="size-3.5" aria-hidden />
        {triggerLabel}
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-border/80 shadow-2xl">
        <DialogHeader className="p-6 pb-2 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="size-5" />
              <DialogTitle className="text-base font-bold">
                Birim Teşkilat, Kadro ve SDP Yetki Tutanağı
              </DialogTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {unit.code}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Resmi mevzuat ve kurum içi arşiv denetim standartlarına uygun teşkilat çizelgesi ve personel yetki belgesi.
          </DialogDescription>
        </DialogHeader>

        {/* PRINTABLE OFFICIAL FORM */}
        <div id="printable-unit-record" className="p-6 space-y-6 text-foreground print:p-0 print:text-black">
          {/* MBB Corporate Header */}
          <div className="text-center pb-4 border-b-2 border-border/80 space-y-1">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase print:text-black">
              T.C.
            </h2>
            <h1 className="text-base font-extrabold tracking-tight text-foreground uppercase print:text-black">
              MERSİN BÜYÜKŞEHİR BELEDİYE BAŞKANLIĞI
            </h1>
            <p className="text-xs font-medium text-muted-foreground print:text-black">
              Yazı İşleri ve Kararlar Dairesi Başkanlığı · Arşiv Şube Müdürlüğü
            </p>
            <div className="pt-2">
              <span className="inline-block border border-primary/30 bg-primary/5 text-primary px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider print:border-black print:text-black print:bg-transparent">
                KURUMSAL BİRİM TEŞKİLAT VE YETKİ DAĞILIM TUTANAĞI
              </span>
            </div>
          </div>

          {/* Form Meta Bar */}
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground border-b border-border/50 pb-2">
            <div>
              <span>Tutanak Tarihi: </span>
              <strong className="text-foreground font-semibold print:text-black">{todayFormatted}</strong>
            </div>
            <div>
              <span>Belge No: </span>
              <strong className="font-mono text-foreground font-semibold print:text-black">MBB-ORG-{unit.code}</strong>
            </div>
          </div>

          {/* 1. Birim Kimlik ve Hiyerarşi Bilgileri */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-1">
              <Building2 className="size-3.5 text-primary" />
              1. Birim Tanım ve Teşkilat Hiyerarşisi
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-border/60 bg-muted/10 p-2.5 space-y-1">
                <span className="text-muted-foreground block text-[11px]">Birim Resmi Adı:</span>
                <span className="font-bold text-foreground text-sm print:text-black">{unit.name}</span>
              </div>
              <div className="rounded border border-border/60 bg-muted/10 p-2.5 space-y-1">
                <span className="text-muted-foreground block text-[11px]">Birim Kodu & Kısa Ad:</span>
                <span className="font-mono font-bold text-foreground print:text-black">
                  {unit.code} {unit.shortName ? `(${unit.shortName})` : ""}
                </span>
              </div>
              <div className="rounded border border-border/60 bg-muted/10 p-2.5 space-y-1">
                <span className="text-muted-foreground block text-[11px]">Bağlı Olduğu Üst Makam:</span>
                <span className="font-semibold text-foreground print:text-black">
                  {parentUnitName || "Kurum Kökü (En Üst Yönetim)"}
                </span>
              </div>
              <div className="rounded border border-border/60 bg-muted/10 p-2.5 space-y-1">
                <span className="text-muted-foreground block text-[11px]">Teşkilat Seviyesi & Durum:</span>
                <span className="font-semibold text-foreground print:text-black">
                  {unit.typeName || "Kademeli Birim"} · {unit.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
            </div>
            <div className="rounded border border-border/60 bg-muted/5 p-2 text-[11px] text-muted-foreground">
              <span>Hiyerarşik Dizin Yolu: </span>
              <code className="font-mono font-semibold text-foreground print:text-black">{unit.path}</code>
            </div>
          </div>

          {/* 2. Kadro ve Görevli Personel Çizelgesi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-border/40 pb-1">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                2. Kadro ve Görevli Personel Çizelgesi ({members.length} Kişi)
              </h3>
              <span className="text-[11px] text-muted-foreground font-medium">
                {primaryMembersCount} Birincil Atama
              </span>
            </div>

            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                Bu birime henüz atanmış personel kaydı bulunmamaktadır.
              </p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Kurumsal Kullanıcı / Özne</th>
                      <th className="px-3 py-2">Atama Türü</th>
                      <th className="px-3 py-2">Kaynak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {members.map((member, idx) => (
                      <tr key={member.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2 font-semibold text-foreground print:text-black">
                          {member.subjectId}
                        </td>
                        <td className="px-3 py-2">
                          {member.isPrimary ? (
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              ★ Birincil Birim
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Ek Birim / Görev</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {member.source === "Directory" ? "Kurum Dizini (LDAP)" : "Manuel Atama"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. SDP Yetkili Konu Başlıkları */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-1">
              <FolderTree className="size-3.5 text-primary" />
              3. Yetkilendirilen Standart Dosya Planı (SDP) Konuları ({details.items.length})
            </h3>

            {details.items.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                Bu birim için tanımlanmış özel dosya planı konu başlığı kısıtlaması bulunmamaktadır (Genel plandan yararlanır).
              </p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-3 py-2">SDP Kodu</th>
                      <th className="px-3 py-2">Konu / Dosya Başlığı</th>
                      <th className="px-3 py-2">Plan Revizyonu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {details.items.map((item) => (
                      <tr key={`${item.planId}-${item.itemId}`}>
                        <td className="px-3 py-2 font-mono font-bold text-foreground print:text-black">
                          {item.code}
                        </td>
                        <td className="px-3 py-2 text-foreground print:text-black">{item.title}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{item.version}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Güvenlik & Denetim Beyanı */}
          <div className="rounded-lg border border-border/80 bg-muted/10 p-3 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground print:text-black">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Sistem Bütünlüğü ve Denetim İzi Beyanı</span>
            </div>
            <p>
              İşbu tutanak verileri, T.C. Mersin Büyükşehir Belediyesi Elektronik Arşiv Sistemi merkezi veritabanı kütüklerinden anlık olarak üretilmiştir. Birim hiyerarşisi, personel yetki değişiklikleri ve SDP yetkilendirmeleri kriptografik denetim kütüklerinde (audit trail) zaman damgalı olarak saklanmaktadır.
            </p>
          </div>

          {/* İmza ve Onay Alanları */}
          <div className="mt-8 pt-4 border-t-2 border-border grid grid-cols-3 gap-4 text-center text-xs">
            <div className="space-y-1">
              <p className="font-bold text-foreground print:text-black">Birim Amiri / Şube Müdürü</p>
              <p className="text-[11px] text-muted-foreground">{unit.name}</p>
              <div className="mt-10 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                İmza / Mühür
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-foreground print:text-black">İnsan Kaynakları ve Eğitim Dairesi</p>
              <p className="text-[11px] text-muted-foreground">Kadro ve Atama Şube Müdürlüğü</p>
              <div className="mt-10 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                İmza / Mühür
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-foreground print:text-black">Arşiv Şube Müdürlüğü</p>
              <p className="text-[11px] text-muted-foreground">Sistem Yöneticisi / Yetkili</p>
              <div className="mt-10 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                İmza / Mühür
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border/50 bg-muted/10 gap-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs"
          >
            Kapat
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            <Printer className="size-3.5" />
            Yazdır / PDF Olarak Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

