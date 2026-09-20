import type { SearchCriteria } from "@/features/search/model/search";
import { validSearchDate } from "@/features/search/model/search-dates";
export const discoveryPageSize = 12;
export const discoverySorts = [{value:"relevance",label:"İlgililik"},{value:"newest",label:"En yeni yüklenen"},{value:"oldest",label:"En eski yüklenen"},{value:"title_asc",label:"Başlık A–Z"},{value:"title_desc",label:"Başlık Z–A"}];
export const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
export function discoveryState(params: Record<string,string|string[]|undefined>, fields: string[]) {
  const active: Record<string,string> = {};
  for (const key of ["q","field","mimeType","filePlanCode","from","to","sort","view"]) if (single(params[key])) active[key]=single(params[key]);
  const q=active.q??"", field=active.field||"keyword", sort=active.sort||"relevance";
  const rawPage=single(params.page)||"1", page=Number(rawPage);
  let error: string | undefined;
  if (!fields.includes(field) || q.length>500 || !discoverySorts.some(s=>s.value===sort) || !/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || page<1 || page*discoveryPageSize>10000)
    error="Arama alanını, sıralamayı ve sayfa numarasını kontrol edin.";
  if (!validSearchDate(active.from??"") || !validSearchDate(active.to??"") || (active.from && active.to && active.from>active.to)) error="Geçerli bir tarih aralığı seçin.";
  const criteria: SearchCriteria={ q:field==="keyword"?q:"",page,pageSize:discoveryPageSize,sort,
    mimeType:active.mimeType,filePlanCode:active.filePlanCode,from:active.from,to:active.to,dateField:"ingestedAt",
    conditions:field!=="keyword"&&q?[{field,operator:"contains",value:q}]:undefined };
  return {active,q,field,sort,page,error,criteria,view:active.view==="list"?"list":"grid"};
}
export function discoveryHref(active: Record<string,string>, changes: Record<string,string|null>={}) {
  const params=new URLSearchParams(active);
  for(const [key,value] of Object.entries(changes)) { if(value===null) params.delete(key);else params.set(key,value); }
  return `/kesfet${params.size?`?${params}`:""}`;
}
export function discoveryBack(value: string) { return /^\/kesfet(?:\?[^#]*)?$/.test(value) ? value : "/kesfet"; }
export function formatFileType(mime: string|null) {
  if(!mime) return "Belge";
  if(mime==="application/pdf")return "PDF";
  if(mime.startsWith("image/"))return mime.slice(6).toUpperCase();
  if(/word|opendocument.text/.test(mime))return "Word";
  if(/sheet|excel/.test(mime))return "Excel";
  if(/presentation|powerpoint/.test(mime))return "Sunum";
  return "Dosya";
}
