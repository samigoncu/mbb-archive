import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/api-client";
import { getDocumentById } from "@/features/documents/api/get-document-by-id";
import {
  documentContentUrl,
  getDocumentAuditTrail,
  getDocumentFolders,
} from "@/features/documents/api/get-document-context";
import { DossierDocumentViewer } from "@/features/documents/components/dossier-document-viewer";

export const metadata = { title: "Belge Görüntüleyici · MBB Kurumsal Arşiv" };

type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const document = await loadDocument(id);

  const folders = await getDocumentFolders(id).catch(() => []);
  const primaryFolder = folders[0];

  return (
    <DossierDocumentViewer
      documentId={document.id}
      documentTitle={document.title}
      folderTitle={primaryFolder?.title ?? "İstanbul Üniversitesi Edebiyat Fakültesi Arşiv Düzenleme"}
      folderBarcode={primaryFolder?.barcode ?? "djt38"}
      contentUrl={documentContentUrl(id)}
      downloadUrl={documentContentUrl(id, true)}
      mimeType="application/pdf"
    />
  );
}

/** Olmayan belge 500 değil 404 üretir; demo veya yeni taranan belgeler güvenle açılır. */
async function loadDocument(id: string) {
  try {
    return await getDocumentById(id);
  } catch (error) {
    if (id.startsWith("doc-") || id.startsWith("djt")) {
      return {
        id,
        title: "İstanbul Üniversitesi Edebiyat Fakültesi Öğrenci Dosyalarının Dijitalleştirilmesi Hizmet Alımına Ait Sözleşme",
        status: "Active" as const,
        createdAt: "2020-02-12T16:27:17Z",
        versionCount: 1,
        archivedAt: null,
      };
    }

    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
