import Link from "next/link";
import type { LinkedDocument } from "../api/get-linked-documents";

export function LinkedDocumentTitle({ document }: { document: LinkedDocument }) {
  return document.details ? (
    <Link href={`/documents/${document.id}`} className="text-sm font-medium text-primary hover:underline">
      {document.details.title}
    </Link>
  ) : (
    <span className="text-sm text-muted-foreground">Belgeye erişilemiyor</span>
  );
}
