import { ShieldCheck, HardDrive, Cpu } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="shrink-0 border-t border-orange-700/40 bg-orange-600 px-4 py-1.5 text-white shadow-md select-none z-30">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-medium">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold tracking-tight">
            Malatya Büyükşehir Belediyesi Kurumsal Arşiv Sistemi
          </span>
          <span className="opacity-75 hidden md:inline">·</span>
          <span className="opacity-90 hidden md:inline">
            Kurumsal Arşiv Otomasyonu (Tüm hakları saklıdır)
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="hidden lg:flex items-center gap-1 bg-black/15 px-2 py-0.5 rounded font-mono">
            <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
            Tesseract OCR & TWAIN Aktif
          </span>
          <span>
            Destek: <strong>444 51 44</strong>
          </span>
          <span className="opacity-60">|</span>
          <span>
            E-Posta: <strong>arsiv@malatya.bel.tr</strong>
          </span>
        </div>
      </div>
    </footer>
  );
}
