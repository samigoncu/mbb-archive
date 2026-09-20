"use client";
import { Files } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DocumentFilingEditor } from "./document-filing-editor";
import { DocumentPhysicalLocation } from "./document-physical-location";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import type { DocumentDetails } from "../api/get-document-by-id";
import type { DocumentVersionSummary } from "../api/get-document-versions";
import { DocumentCancellationPanel } from "./document-cancellation-panel";
import { CancelVersionPanel } from "./cancel-version-panel";

export function DocumentActions({ details, versions, selectedVersion, canCancelVersion, canCancelDocument, folders = [] }: {
  details: DocumentDetails; versions: DocumentVersionSummary[]; selectedVersion: number;
  canCancelVersion: boolean; canCancelDocument: boolean; folders?: FolderListItem[];
}) {
  return <section id="belge-islemleri" className="@container space-y-6">
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary"><Files className="size-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">İşlem yapılacak belge</p>
        <p className="mt-1 break-words text-sm font-semibold">{details.title}</p>
      </div>
      <span className="shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium">Sürüm v{selectedVersion}</span>
    </div>

    <Tabs defaultValue="digital" className="gap-4">
      <TabsList className="!h-auto w-full flex-wrap gap-1 p-1" aria-label="Belge işlemleri">
        <TabsTrigger value="digital" className="min-h-10">Sanal dosyalama</TabsTrigger>
        <TabsTrigger value="physical" className="min-h-10">Fiziksel konum</TabsTrigger>
        <TabsTrigger value="version" className="min-h-10">Sürüm iptali</TabsTrigger>
        <TabsTrigger value="document" className="min-h-10">Belge iptali / Geri alma</TabsTrigger>
      </TabsList>
      <TabsContent value="digital">
        <h2 className="font-semibold">Sanal dosyalama</h2>
        <p className="mt-1 text-xs text-muted-foreground">Belgenin birimine ait SDP konusunu ve sanal dosyayı seçin.</p>
        <DocumentFilingEditor documentId={details.id} inline />
      </TabsContent>
      <TabsContent value="physical">
        <DocumentPhysicalLocation key={details.id} documentId={details.id} folders={folders} cancelled={details.status === "Cancelled"} inline />
      </TabsContent>
      <TabsContent value="version" className="rounded-lg border border-border p-4">
        <h2 className="mb-3 font-semibold">Seçili sürüm · v{selectedVersion}</h2>
        {details.status === "Cancelled" ? <p className="text-sm text-muted-foreground">Sürüm işlemleri için önce belge iptalini geri alın.</p>
          : <CancelVersionPanel key={`${details.id}:${selectedVersion}:${details.concurrencyVersion}`} documentId={details.id} version={versions.find(v => v.versionNumber === selectedVersion)} versions={versions} currentVersion={details.currentVersionNumber ?? details.versionCount} expectedVersion={details.concurrencyVersion} canCancel={canCancelVersion} archived={details.status === "Archived"} />}
      </TabsContent>
      <TabsContent value="document">
        <DocumentCancellationPanel key={`${details.id}:${details.status}:${details.concurrencyVersion}`} details={details} canCancel={canCancelDocument} />
      </TabsContent>
    </Tabs>
  </section>;
}
