import Link from "next/link";
export default function NotFound() { return <section className="mx-auto max-w-2xl px-6 py-24 text-center"><h1 className="text-2xl font-semibold">Belge bulunamadı</h1><p className="my-5">Belge veya sürüm mevcut değil ya da erişim kapsamınızda değil.</p><Link href="/kesfet" className="underline">Arşive dön</Link></section>; }
