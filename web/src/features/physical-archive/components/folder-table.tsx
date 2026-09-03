import { FileText, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, Panel } from "@/components/ui/page";
import { MoveFolderDialog } from "@/features/physical-archive/components/folder-dialogs";
import {
  folderStatusLabels,
  type FolderListItem,
} from "@/features/physical-archive/model/folder";
import type { LocationListItem } from "@/features/physical-archive/model/location";

const statusVariants: Record<string, "success" | "info" | "outline" | "destructive"> = {
  Available: "success",
  OnLoan: "info",
  Transferred: "outline",
  Disposed: "destructive",
};

export function FolderTable({
  folders,
  locations,
}: {
  folders: FolderListItem[];
  locations: LocationListItem[];
}) {
  if (folders.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={FileText}
          title="Kayıt bulunamadı"
          description="Arama kriterlerini değiştirin veya yeni bir dosya oluşturun."
        />
      </Panel>
    );
  }

  return (
    <Panel className="max-h-[calc(100vh-22rem)] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Barkod</TableHead>
            <TableHead>Dosya Başlığı</TableHead>
            <TableHead className="w-28">Dosya Planı</TableHead>
            <TableHead className="w-56">Konum</TableHead>
            <TableHead className="w-24 text-right">Evrak</TableHead>
            <TableHead className="w-28">Durum</TableHead>
            <TableHead className="w-20 text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {folders.map((folder) => (
            <TableRow key={folder.id}>
              <TableCell className="font-mono text-xs font-medium">{folder.barcode}</TableCell>
              <TableCell className="font-medium">{folder.title}</TableCell>
              <TableCell className="font-mono text-xs">{folder.filePlanCode}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">
                    {folder.locationCode} · {folder.locationName}
                  </span>
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <FileText className="size-3.5 text-muted-foreground" aria-hidden />
                  {folder.documentCount}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariants[folder.status] ?? "outline"}>
                  {folderStatusLabels[folder.status] ?? folder.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <MoveFolderDialog
                  folderId={folder.id}
                  folderBarcode={folder.barcode}
                  currentLocationId={folder.locationId}
                  locations={locations}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
