import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AuditEntry } from "@/features/documents/api/get-document-context";
import type { FolderListItem } from "@/features/physical-archive/model/folder";

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "medium",
});

const eventLabels: Record<string, string> = {
  "documents.created.v1": "Belge oluşturuldu",
  "documents.file-staged.v1": "Dosya yüklendi",
  "documents.file-security-approved.v1": "Güvenlik taraması onayladı",
  "documents.file-security-rejected.v1": "Güvenlik taraması reddetti",
  "documents.file-promotion-requested.v1": "Arşive alma istendi",
  "documents.original-stored.v1": "Orijinal depolandı",
  "processing.pdf-inspection-requested.v1": "PDF incelemesi istendi",
  "processing.pdf-inspection-completed.v1": "PDF incelemesi tamamlandı",
  "processing.ocr-requested.v1": "OCR istendi",
  "processing.ocr-completed.v1": "OCR tamamlandı",
  "search.document-indexed.v1": "Aramaya indekslendi",
};

export function PhysicalLocationPanel({ folders }: { folders: FolderListItem[] }) {
  if (folders.length === 0) {
    return (
      <EmptyPanel text="Bu belge herhangi bir fiziksel klasöre bağlanmamış." />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {folders.map((folder) => (
        <li
          key={folder.id}
          className="rounded-lg border border-border bg-card p-3 shadow-flat"
        >
          <Link
            href={`/dosya-islemleri?barcode=${encodeURIComponent(folder.barcode)}`}
            className="font-mono text-xs font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {folder.barcode}
          </Link>
          <p className="mt-0.5 text-sm font-medium">{folder.title}</p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {folder.locationCode} · {folder.locationName}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function AuditTrailPanel({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <EmptyPanel text="Bu belge için denetim kaydı bulunmuyor." />;
  }

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.messageId} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
            {index < entries.length - 1 ? (
              <span className="w-px flex-1 bg-border" aria-hidden />
            ) : null}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium">
              {eventLabels[entry.eventName] ?? entry.eventName}
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {dateTime.format(new Date(entry.occurredAt))}
            </p>
            <p className="mt-1 font-mono text-2xs text-muted-foreground">
              #{entry.sequence} · {entry.entryHash.slice(0, 16)}…
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EvidencePanel() {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <p className="inline-flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        E-imza doğrulaması bağlanmadı
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Evidence modülünde <span className="font-mono text-xs">pdf/validate</span>,{" "}
        <span className="font-mono text-xs">cms/validate</span> ve{" "}
        <span className="font-mono text-xs">timestamp/validate</span> uçları hazır;
        belge baytlarını bu uçlara taşıyan akış henüz yazılmadı.
      </p>
      <Badge variant="outline" className="mt-2">
        Sonraki iş
      </Badge>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
