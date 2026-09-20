import { notFound } from "next/navigation";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { ApiError } from "@/lib/api/api-client";
import { getDocumentById } from "@/features/documents/api/get-document-by-id";
import {
  documentContentUrl,
  getDocumentAuditTrail,
  getDocumentFolders,
} from "@/features/documents/api/get-document-context";
import { getDocumentIntegrity } from "@/features/documents/api/get-document-integrity";
import { getDocumentText } from "@/features/documents/api/get-document-text";
import { getDocumentVersions } from "@/features/documents/api/get-document-versions";
import { DocumentWorkspace } from "@/features/documents/components/document-workspace";
import {
  getCollections,
  getCollectionsForDocument,
} from "@/features/collections/api/get-collections";
import {
  getDocumentGeoRelations,
  getGeoEntities,
} from "@/features/geo/api/get-geo";

export const metadata = { title: "Belge Görüntüleyici" };

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ version?: string | string[] }> };

export default async function DocumentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { version } = await searchParams;
  if (version !== undefined && (typeof version !== "string" || !/^[1-9]\d*$/.test(version) || !Number.isSafeInteger(Number(version)))) notFound();

  const details = await getDocumentById(id).catch((error: unknown) => {
    // Olmayan belge 500 değil 404 üretir; örnek veriye düşülmez.
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  });

  const [
    integrity,
    versions,
    text,
    folders,
    audit,
    memberOf,
    allCollections,
    geoRelations,
    geoEntities,
    user,
  ] =
    await Promise.all([
      getDocumentIntegrity(id),
      getDocumentVersions(id),
      getDocumentText(id),
      getDocumentFolders(id).catch(() => []),
      getDocumentAuditTrail(id, 25).catch(() => []),
      getCollectionsForDocument(id),
      getCollections(),
      getDocumentGeoRelations(id),
      getGeoEntities(),
      getCurrentUser(),
    ]);

  const selectedVersion = version === undefined
    ? details.currentVersionNumber ?? integrity?.versionNumber ?? details.versionCount
    : Number(version);
  if (version !== undefined && !versions.some(item => item.versionNumber === selectedVersion)) notFound();

  return (
    <DocumentWorkspace
      details={details}
      integrity={integrity}
      versions={versions}
      selectedVersion={selectedVersion}
      canCancelDocument={Boolean(user?.isAuthenticated && (user.isBootstrapAdministrator || user.permissions.includes("documents.cancel")))}
      canCancel={Boolean(user?.isAuthenticated && (user.isBootstrapAdministrator || user.permissions.includes("documents.versions.cancel")))}
      text={text}
      folders={folders}
      collections={{ memberOf, available: allCollections.items }}
      geo={{ relations: geoRelations, entities: geoEntities.items }}
      audit={audit}
      canUpload={Boolean(user?.isAuthenticated && (user.isBootstrapAdministrator || user.permissions.includes("documents.write")))}
      contentUrl={documentContentUrl(id, false, selectedVersion || undefined)}
      downloadUrl={documentContentUrl(id, true, selectedVersion || undefined)}
    />
  );
}
