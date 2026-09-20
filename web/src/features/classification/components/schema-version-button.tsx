"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSchemaVersionAction } from "@/features/classification/api/metadata-actions";

/** Yayımlanmış şemanın alanlarını kopyalayarak düzenlenebilir bir sürüm açar. */
export function SchemaVersionButton({ schemaId, nextVersion }: { schemaId: string; nextVersion: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return <span className="flex flex-col gap-2">
    <Button type="button" size="sm" disabled={pending} onClick={async () => {
      setPending(true); setError("");
      const result = await createSchemaVersionAction(schemaId);
      setPending(false);
      if (result.error) { setError(result.error); return; }
      toast.success(`v${nextVersion} taslağı, alanlar kopyalanarak oluşturuldu.`);
      router.push(`/tanimlamalar/ustveri?id=${result.id}`);
      router.refresh();
    }}>
      <CopyPlus className="size-4" aria-hidden />
      {pending ? "Oluşturuluyor…" : `v${nextVersion} taslağı oluştur`}
    </Button>
    {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
  </span>;
}
