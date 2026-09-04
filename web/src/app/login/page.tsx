"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  Lock,
  QrCode,
  ScanLine,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();

  // Form State
  const [username, setUsername] = useState("arsiv_admin");
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [language, setLanguage] = useState<"tr" | "en">("tr");
  const [isLoading, setIsLoading] = useState(false);

  // Şifremi Unuttum Modalı State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Lütfen kullanıcı adı ve şifrenizi girin.");
      return;
    }

    setIsLoading(true);
    toast.loading("Kimlik doğrulanıyor, oturum açılıyor...", { id: "login-toast" });

    // Oturum açma simülasyonu / token hazırlığı
    setTimeout(() => {
      setIsLoading(false);
      toast.success(
        <div className="flex flex-col gap-0.5">
          <span className="font-bold">Hoş Geldiniz, Ali METE</span>
          <span className="text-xs">Malatya Büyükşehir Belediyesi Kurumsal Arşiv sistemine başarıyla giriş yapıldı.</span>
        </div>,
        { id: "login-toast", duration: 3000 }
      );
      router.push("/");
    }, 900);
  }

  function handleEdevletLogin() {
    setIsLoading(true);
    toast.loading("Türksat E-Devlet Kapısına yönlendiriliyor...", { id: "login-toast" });
    setTimeout(() => {
      setIsLoading(false);
      toast.success("E-Devlet Kimlik Doğrulaması Başarılı (T.C. 28491028491)", {
        id: "login-toast",
      });
      router.push("/");
    }, 1200);
  }

  function handleEimzaLogin() {
    setIsLoading(true);
    toast.loading("KamuSM Nitelikli Elektronik Sertifika taranıyor...", { id: "login-toast" });
    setTimeout(() => {
      setIsLoading(false);
      toast.success("E-İmza Akıllı Kart Doğrulandı. Oturum açıldı.", {
        id: "login-toast",
      });
      router.push("/");
    }, 1200);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* ========================================================================= */}
      {/* SOL BÖLÜM: VİZYONEL 3D ARŞİV VE %100 WEB TABANLI HERO ALANI (LG EKRANLAR) */}
      {/* ========================================================================= */}
      <div className="relative hidden lg:flex lg:w-[62%] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0c2f78] via-[#092257] to-[#04102c] p-8 xl:p-12 text-white">
        {/* Arka Plan Atmosferik Işıklar ve Grid Aurası */}
        <div className="pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full bg-sky-500/20 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-40 right-10 size-[500px] rounded-full bg-indigo-500/20 blur-[130px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

        {/* Üst Başlık & Belediye Kurumsal Kimliği */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <ShieldCheck className="size-6 text-sky-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-300">
                T.C. MALATYA BÜYÜKŞEHİR BELEDİYESİ
              </span>
              <h2 className="text-sm font-bold tracking-tight text-white">
                Bilgi İşlem Dairesi · Kurumsal Arşiv Otomasyonu
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-500/20 border border-sky-400/30 px-3 py-1 text-[11px] font-bold text-sky-200">
              TS 13298 Uyumlu EBYS & Arşiv
            </span>
          </div>
        </div>

        {/* Orta Alan: 3D Klasörler ve Kırılan Parçacıklar İllüstrasyonu */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto py-4">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-b from-sky-900/30 to-slate-900/40 p-2 shadow-2xl backdrop-blur-xs">
            {/* Kırpılmış Gerçek Arşiv İllüstrasyonu */}
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
              <img
                src="/images/login-banner.png"
                alt="MBB Kurumsal % 100 Web Tabanlı Dijital Arşiv"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Sol Alt Köşede "% 100 web Tabanlı" Başlığı */}
              <div className="absolute bottom-4 left-6 z-20 flex flex-col">
                <span className="font-black text-amber-400 text-3xl sm:text-4xl tracking-wide drop-shadow-[0_4px_12px_rgba(251,191,36,0.6)]">
                  % 100 web Tabanlı
                </span>
                <span className="text-xs font-semibold text-slate-200 drop-shadow-md">
                  Herhangi bir eklenti veya masaüstü istemcisi gerektirmeden tarayıcı üzerinden tam erişim
                </span>
              </div>
            </div>
          </div>

          {/* 4 Ana Özellik Vitrini */}
          <div className="grid grid-cols-4 gap-3 w-full max-w-2xl mt-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs text-center flex flex-col items-center">
              <ScanLine className="size-4 text-sky-400 mb-1" />
              <span className="text-[11px] font-bold text-white">TWAIN Tarama</span>
              <span className="text-[9px] text-slate-300">ADF & Seri Besleme</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs text-center flex flex-col items-center">
              <Sparkles className="size-4 text-amber-400 mb-1" />
              <span className="text-[11px] font-bold text-white">Tesseract OCR</span>
              <span className="text-[9px] text-slate-300">Tam Metin Arama</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs text-center flex flex-col items-center">
              <HardDrive className="size-4 text-emerald-400 mb-1" />
              <span className="text-[11px] font-bold text-white">Raylı Dolap</span>
              <span className="text-[9px] text-slate-300">2D/3D Simülatör</span>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xs text-center flex flex-col items-center">
              <Shield className="size-4 text-rose-400 mb-1" />
              <span className="text-[11px] font-bold text-white">5070 E-İmza</span>
              <span className="text-[9px] text-slate-300">Yasal Geçerlilik</span>
            </div>
          </div>
        </div>

        {/* Sol Alt Bilgi Şeridi */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-4 text-xs text-slate-300">
          <span>T.C. Malatya Büyükşehir Belediyesi · Bilgi İşlem Dairesi Başkanlığı</span>
          <span>Malatya Büyükşehir Belediyesi Arşiv Sistemi v2.6.4</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SAĞ BÖLÜM: MODERN VE TEMİZ MBB Arşiv GİRİŞ KARTI                            */}
      {/* ========================================================================= */}
      <div className="flex w-full lg:w-[38%] flex-col justify-between bg-white dark:bg-slate-900 px-6 sm:px-12 py-8 overflow-y-auto">
        <div className="w-full max-w-sm mx-auto my-auto flex flex-col gap-6">
          {/* 1. MBB Arşiv İKONİK DAİRESEL LOGO EMBLEMİ */}
          <div className="flex flex-col items-center text-center">
            <div className="relative flex size-28 items-center justify-center">
              {/* Dış Halka Renkli Segmentler (Turuncu ve Kırmızı Yaylar) */}
              <svg className="absolute inset-0 size-full -rotate-45" viewBox="0 0 100 100">
                {/* Turuncu Yay */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="8"
                  strokeDasharray="180 300"
                  strokeLinecap="round"
                />
                {/* Kırmızı Yay */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="8"
                  strokeDasharray="80 300"
                  strokeDashoffset="-180"
                  strokeLinecap="round"
                />
              </svg>

              {/* İç Koyu Daire & Petek Deseni Aurası */}
              <div className="flex size-20 items-center justify-center rounded-full bg-slate-950 border-4 border-amber-400/90 shadow-xl overflow-hidden relative">
                {/* Petek Arka Plan */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:6px_6px] opacity-60" />

                {/* Kaligrafi MBB Arşiv Logosu */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center">
                  <span className="font-serif italic font-black text-2xl text-white tracking-tighter leading-none">
                    d
                  </span>
                  <span className="text-[6px] font-bold text-amber-300 tracking-widest uppercase mt-0.5">
                    MBB ARŞİV
                  </span>
                </div>
              </div>
            </div>

            {/* Başlık ve Alt Başlık */}
            <h1 className="mt-3 text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Kurumsal Arşiv Yönetim Sistemleri
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Malatya Büyükşehir Belediyesi Elektronik Belge Portalı
            </p>
          </div>

          {/* 2. GİRİŞ FORMU */}
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5 text-xs">
            {/* Kullanıcı Adı */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" className="font-semibold text-foreground text-xs">
                Kullanıcı Adı / Sicil No
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="arsiv_admin"
                  className="h-10 pl-9 rounded-lg border-border text-xs focus-visible:ring-2 focus-visible:ring-primary"
                  required
                />
              </div>
            </div>

            {/* Şifre */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="font-semibold text-foreground text-xs">
                Parola
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 pl-9 pr-9 rounded-lg border-border text-xs focus-visible:ring-2 focus-visible:ring-primary font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Beni Hatırla & Şifremi Unuttum */}
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-3.5 rounded border-border text-primary"
                />
                <span>Beni Hatırla</span>
              </label>

              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
              >
                Şifremi Unuttum
              </button>
            </div>

            {/* Dil Seçimi (MBB Arşiv Screenshot paritesi) */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background pl-8.5 pr-8 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="tr">Türkçe (Varsayılan)</option>
                  <option value="en">English (International)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Ana Oturum Aç Butonu */}
            <Button
              type="submit"
              disabled={isLoading}
              className="mt-1.5 h-10 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.99]"
            >
              {isLoading ? "Giriş Yapılıyor..." : "Oturum Aç"}
            </Button>
          </form>

          {/* Alternatif Kurumsal Girişler */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <div className="relative flex items-center justify-center my-1">
              <span className="bg-white dark:bg-slate-900 px-2 text-[10px] uppercase font-bold text-muted-foreground">
                veya kurumsal kimlik ile
              </span>
            </div>

            <button
              type="button"
              onClick={handleEdevletLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-red-600/30 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition-colors"
            >
              <span className="size-2 rounded-full bg-red-600" />
              <span>Türksat E-Devlet ile Giriş</span>
            </button>

            <button
              type="button"
              onClick={handleEimzaLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              <KeyRound className="size-3.5 text-primary" />
              <span>KamuSM E-İmza (Akıllı Kart / Token)</span>
            </button>
          </div>
        </div>

        {/* Alt Destek & Telif */}
        <div className="pt-4 border-t border-border flex flex-col items-center text-center gap-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>256-Bit SSL/TLS Güvenli İletişim Protokolü</span>
          </div>
          <span>
            Destek ve Bilgi İşlem: <strong>444 51 44</strong> · <strong>arsiv@malatya.bel.tr</strong>
          </span>
        </div>
      </div>

      {/* Şifremi Unuttum Modalı */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl border border-border flex flex-col gap-3">
            <h3 className="text-sm font-bold text-foreground">Şifre Sıfırlama Talebi</h3>
            <p className="text-xs text-muted-foreground">
              Kayıtlı kurumsal e-posta veya sicil numaranızı girin. Bilgi İşlem Dairesi tarafından sıfırlama bağlantısı gönderilecektir.
            </p>
            <Input
              type="text"
              placeholder="kurumsal@malatya.bel.tr veya sicil no"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="text-xs"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsForgotOpen(false)}>
                Vazgeç
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast.success("Şifre sıfırlama talebiniz Bilgi İşlem onayına iletildi.");
                  setIsForgotOpen(false);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Talep Gönder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
