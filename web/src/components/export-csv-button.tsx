"use client";
import { Button } from "@/components/ui/button";
export function csvCell(value: string | number | null): string {
  const text = String(value ?? "");
  const safe = /^[=+@\-\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function ExportCsvButton({
  name,
  headers,
  rows,
}: {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}) {
  function download() {
    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(";"))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!rows.length}
      onClick={download}
    >
      Görünen kayıtları CSV indir
    </Button>
  );
}
