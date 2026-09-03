import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDocuments } from "@/features/documents/api/get-documents";
import { EmptyState, PageHeader, Panel } from "@/components/ui/page";

export const metadata = { title: "Belgeler · MBB Kurumsal Arşiv" };

const pageSize = 25;

const statusLabels: Record<string, string> = {
  Draft: "Taslak",
  Active: "Aktif",
  Archived: "Arşivlendi",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Number.parseInt(rawPage ?? "1", 10) || 1;

  const documents = await getDocuments(page, pageSize);
  const lastPage = Math.max(1, Math.ceil(documents.totalCount / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Belgeler"
        description="Dijital belge kayıtları ve versiyonları."
      />

      {documents.items.length === 0 ? (
        <Panel>
          <EmptyState icon={FileText} title="Henüz belge kaydı yok" />
        </Panel>
      ) : (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başlık</TableHead>
                <TableHead className="w-32">Durum</TableHead>
                <TableHead className="w-28 text-right">Versiyon</TableHead>
                <TableHead className="w-44">Oluşturma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.items.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/documents/${document.id}`}
                      className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {document.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={document.status === "Archived" ? "success" : "info"}
                    >
                      {statusLabels[document.status] ?? document.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {document.versionCount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(document.createdAt).toLocaleString("tr-TR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {documents.totalCount} kayıt
        </p>
        {lastPage > 1 ? (
          <nav aria-label="Sayfalama" className="flex items-center gap-3 text-sm">
            {page > 1 ? (
              <Link href={`/documents?page=${page - 1}`} className="hover:underline">
                Önceki
              </Link>
            ) : null}
            <span className="tabular-nums">
              {page} / {lastPage}
            </span>
            {page < lastPage ? (
              <Link href={`/documents?page=${page + 1}`} className="hover:underline">
                Sonraki
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
