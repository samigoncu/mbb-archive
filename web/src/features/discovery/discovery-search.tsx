import { Search, SlidersHorizontal } from "lucide-react";
import styles from "./discovery.module.css";
export function DiscoverySearch({q="",field="keyword",fields=[],active={}}: {q?:string;field?:string;fields?:{key:string;label:string}[];active?:Record<string,string>}) {
  return <section className={styles.hero}>
    <div className={styles.heroInner}><span className={styles.eyebrow}>MBB DİJİTAL ARŞİV</span><h1>Kurumsal hafızayı keşfedin.</h1><p>Belgeler, kararlar ve kayıtlar. Yetkiniz olan arşiv tek bir yerde.</p>
      <form action="/kesfet" id="discovery-search" className={styles.search}>
        <label className="sr-only" htmlFor="discovery-field">Arama alanı</label>
        <select id="discovery-field" name="field" defaultValue={field}><option value="keyword">Başlık ve içerik</option><option value="title">Belge başlığı</option>{fields.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select>
        <label className="sr-only" htmlFor="discovery-query">Arşivde ara</label><input id="discovery-query" name="q" defaultValue={q} maxLength={500} placeholder="Belge adı veya anahtar kelime yazın…"/><button type="submit"><Search size={21}/>Ara</button>
        {active.view && <input type="hidden" name="view" value={active.view}/>}
      </form>
      <details className={styles.advanced} open={!!(active.from||active.to)}><summary><SlidersHorizontal size={15}/>Gelişmiş arama</summary><div><label>Yüklenme başlangıcı<input type="date" name="from" form="discovery-search" defaultValue={active.from}/></label><label>Yüklenme bitişi<input type="date" name="to" form="discovery-search" defaultValue={active.to}/></label><button type="submit" form="discovery-search">Tarihlerle ara</button></div></details>
    </div>
  </section>;
}
