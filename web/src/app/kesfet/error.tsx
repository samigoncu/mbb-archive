"use client";
import Link from "next/link";
export default function DiscoveryError({reset}: {reset:()=>void}) {
  return <section className="mx-auto max-w-2xl px-6 py-24 text-center"><h1 className="text-2xl font-semibold">Belgeye erişilemedi</h1><p className="my-5 text-sm">Oturumunuzun ve belge erişim yetkinizin geçerli olduğunu kontrol edin. Hizmet geçici olarak yanıt vermiyorsa yeniden deneyebilirsiniz.</p><button type="button" onClick={reset} className="mr-4 rounded border px-4 py-2">Yeniden dene</button><Link href="/kesfet" className="underline">Arşive dön</Link></section>;
}
