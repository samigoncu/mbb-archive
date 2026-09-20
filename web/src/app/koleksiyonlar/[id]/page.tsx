import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { getDocuments } from "@/features/documents/api/get-documents";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { addDocumentToCollectionAction } from "@/features/collections/api/add-to-collection-action";
import { EditCollectionDialog } from "@/features/collections/components/collection-board";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Panel } from "@/components/ui/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCollection } from "@/features/collections/api/get-collections";
import { RemoveFromCollectionButton } from "@/features/collections/components/remove-from-collection-button";
import { getLinkedDocuments } from "@/features/documents/api/get-linked-documents";
import { LinkedDocumentTitle } from "@/features/documents/components/linked-document-title";
import { ExplorerPagination, positivePage } from "@/features/documents/components/explorer-pagination";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KoleksiyonDetayPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const collection = await getCollection(id);

  if (!collection) {
    notFound();
  }
  const filters = await searchParams;
  const query = typeof filters.q === "string" ? filters.q.trim() : "";
  const candidatePage = positivePage(filters.candidatePage);
  const user = await getCurrentUser();
  const canEdit = !!user && (user.isBootstrapAdministrator || (user.subject === collection.ownerSubject && user.permissions.includes("collections.manage")));
  const candidates = canEdit && query ? await getDocuments(candidatePage, 10, {search: query}) : null;
  const included = new Set(collection.items.map(item => item.documentId));
  const totalPages = Math.max(1, Math.ceil(collection.items.length / 25));
  const page = Math.min(positivePage(filters.page), totalPages);
  const items = collection.items.slice((page - 1) * 25, page * 25);
  const documents = await getLinkedDocuments(items.map((item) => item.documentId));

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/koleksiyonlar"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Koleksiyonlar
      </Link>

      <PageHeader
        title={collection.name}
        description={collection.description ?? undefined}
        actions={
          collection.isShared ? (
            <Badge variant="info">
              <Users className="size-3" aria-hidden />
              Paylaşılan
            </Badge>
          ) : (
            <Badge variant="secondary">Kişisel</Badge>
          )
        }
      />

      <p className="rounded-lg border border-border bg-card p-3 text-sm leading-6 text-muted-foreground">Koleksiyon, bir konuya ait belgeleri bir araya getirir. Belgeler mevcut birim ve dosyalarında kalır; koleksiyona eklemek kopya oluşturmaz veya erişim yetkisini değiştirmez.</p>
      {canEdit && <EditCollectionDialog collection={{ ...collection, itemCount: collection.items.length }} />}
      {canEdit && <Panel title="Koleksiyona belge ekle" padded>
        <form className="flex items-end gap-2"><label className="min-w-0 flex-1 text-sm font-medium">Belge başlığında ara<Input name="q" defaultValue={query} placeholder="Belge başlığı veya konusu" required className="mt-1" /></label><button className="h-10 rounded-lg bg-primary px-5 text-sm text-primary-foreground">Ara</button>{query && <Link href={`/koleksiyonlar/${id}`} className="px-2 py-2 text-sm underline">Temizle</Link>}</form>
        {candidates && <div className="mt-4"><p className="mb-2 text-xs text-muted-foreground">{candidates.totalCount} erişilebilir belge eşleşti.</p><ul className="divide-y divide-border">{candidates.items.map(document => <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><Link href={`/documents/${document.id}`} className="min-w-0 flex-1 break-words text-sm font-medium hover:text-primary hover:underline">{document.title}</Link>{included.has(document.id) ? <span className="text-xs text-muted-foreground">Koleksiyonda</span> : <ActionForm action={addDocumentToCollectionAction} label="Koleksiyona ekle"><input type="hidden" name="collectionId" value={id} /><input type="hidden" name="documentId" value={document.id} /></ActionForm>}</li>)}</ul>{!candidates.items.length && <p className="py-3 text-sm text-muted-foreground">Eşleşen belge bulunamadı. Farklı bir başlıkla arayın.</p>}<ExplorerPagination page={candidatePage} totalPages={Math.max(1,Math.ceil(candidates.totalCount/10))} href={next => `/koleksiyonlar/${id}?${new URLSearchParams({q:query,candidatePage:String(next)})}`} label="Eklenecek belge sayfaları" /></div>}
      </Panel>}
      <Panel
        title="Belgeler"
        description={`${collection.items.length} kayıt · sahibi ${collection.ownerSubject}`}
      >
        {collection.items.length === 0 ? (
          <EmptyState
            title="Bu koleksiyon boş"
            description={canEdit ? "Yukarıdaki arama alanından belge bulup koleksiyona ekleyin." : "Koleksiyon sahibi henüz erişebildiğiniz bir belge eklememiş."}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Belge</TableHead>
                  <TableHead className="w-40">Ekleyen</TableHead>
                  <TableHead className="w-36">Tarih</TableHead>
                  <TableHead className="w-24 text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.documentId}>
                    <TableCell>
                      <LinkedDocumentTitle document={documents[index]} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.addedBy}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.addedAt).toLocaleDateString("tr-TR", {
                        dateStyle: "medium",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && <RemoveFromCollectionButton
                        collectionId={collection.id}
                        documentId={item.documentId}
                      />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
      <ExplorerPagination page={page} totalPages={totalPages} href={(next) => `/koleksiyonlar/${id}?page=${next}`} label="Koleksiyon belge sayfaları" />
    </div>
  );
}
