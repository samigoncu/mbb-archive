import Link from "next/link";
import { CheckCircle2, FileSignature, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Panel } from "@/components/ui/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  evidenceKindLabels,
  evidenceStatusLabels,
  evidenceStatusVariants,
  type EvidenceCapabilities,
  type EvidenceValidationListItem,
} from "@/features/evidence/model/evidence";

/**
 * Yetenek tablosu neyin gerçekten yapılabildiğini söyler. Yapılandırılmamış
 * bir sağlayıcı "var" gibi gösterilmez; aksi halde ekran doğrulanmamış bir
 * belgeyi doğrulanmış sanmaya yol açar.
 */
export function EvidenceCapabilityPanel({
  capabilities,
  timestampAuthorityConfigured,
}: {
  capabilities: EvidenceCapabilities | null;
  timestampAuthorityConfigured: boolean;
}) {
  if (!capabilities) {
    return (
      <Panel>
        <EmptyState
          icon={FileSignature}
          title="Kanıt servisi yanıt vermiyor"
          description="Yetenekler okunamadı; doğrulama yapılamaz."
        />
      </Panel>
    );
  }

  const rows = [
    {
      name: "CMS / PKCS#7 imza",
      available: true,
      detail: capabilities.cms,
    },
    {
      name: "RFC 3161 zaman damgası doğrulama",
      available: true,
      detail: capabilities.rfc3161,
    },
    {
      name: "Zaman damgası alma (TSA)",
      available: timestampAuthorityConfigured,
      detail: timestampAuthorityConfigured
        ? "Zaman damgası makamı yapılandırıldı."
        : "Zaman damgası makamı adresi tanımlı değil.",
    },
    {
      name: "PDF / PAdES",
      available: capabilities.pdfPadesConfigured === true,
      detail: capabilities.pdfPades,
    },
  ];

  return (
    <Panel
      title="Doğrulama yetenekleri"
      description={`Satır içi azami boyut: ${formatBytes(capabilities.maxInlineDecodedBytes)}`}
    >
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.name} className="flex items-start gap-2.5 px-4 py-4">
            {row.available ? (
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-label="Kullanılabilir"
              />
            ) : (
              <XCircle
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-label="Kullanılamıyor"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.name}</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">{row.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function EvidenceValidationTable({
  validations,
  totalCount,
}: {
  validations: EvidenceValidationListItem[];
  totalCount: number;
}) {
  if (validations.length === 0) {
    return (
      <Panel title="Doğrulama geçmişi">
        <EmptyState
          icon={FileSignature}
          title="Henüz doğrulama yapılmadı"
          description="Yapılan her imza ve zaman damgası doğrulaması burada kalıcı olarak listelenir."
        />
      </Panel>
    );
  }

  return (
    <Panel title="Doğrulama geçmişi" description={`${totalCount} kayıt`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Tür</TableHead>
              <TableHead className="w-28">Sonuç</TableHead>
              <TableHead>Sağlayıcı / profil</TableHead>
              <TableHead className="w-32">Belge</TableHead>
              <TableHead className="w-40">Zaman</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validations.map((validation) => (
              <TableRow key={validation.id}>
                <TableCell className="text-sm">
                  {evidenceKindLabels[validation.kind] ?? validation.kind}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      evidenceStatusVariants[validation.status] ?? "secondary"
                    }
                  >
                    {evidenceStatusLabels[validation.status] ?? validation.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {validation.provider}
                  <span className="mt-0.5 block">{validation.profile}</span>
                </TableCell>
                <TableCell>
                  {validation.documentId ? (
                    <Link
                      href={`/documents/${validation.documentId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Belgeyi aç
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(validation.startedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}
