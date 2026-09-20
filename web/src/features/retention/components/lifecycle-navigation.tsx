import Link from "next/link";
import { CalendarClock, Gavel, FileCheck2, ShieldCheck } from "lucide-react";
const entries = [
  { href:"/devir-imha", label:"Saklama ve İmha", detail:"Süreler, kurallar ve hukuki blokeler", Icon:CalendarClock },
  { href:"/devir-imha/islemler", label:"Komisyon ve Devir", detail:"Görüşler, kararlar ve teslim", Icon:Gavel },
  { href:"/kayit-beyani", label:"Kayıt Beyanı", detail:"Aday kayıtları arşiv kaydına dönüştürme", Icon:FileCheck2 },
  { href:"/kanit", label:"Kanıt ve İmza", detail:"İmza doğrulama ve sonuç geçmişi", Icon:ShieldCheck },
];
export function LifecycleNavigation({ active }: { active:string }) {
  return <nav aria-label="Arşiv yaşam döngüsü" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{entries.map(({href,label,detail,Icon}) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/40 aria-current:border-primary/40 aria-current:bg-primary/5"><Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div></Link>)}</nav>;
}
