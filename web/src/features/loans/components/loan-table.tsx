import Link from "next/link";
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
import { HandCoins } from "lucide-react";
import { ReturnLoanButton } from "@/features/loans/components/return-loan-button";
import {
  loanStatusLabels,
  type LoanDetailsItem,
} from "@/features/loans/model/loan";

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function LoanTable({ loans }: { loans: LoanDetailsItem[] }) {
  if (loans.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={HandCoins}
          title="Ödünç kaydı bulunamadı"
          description="Seçili filtreye uyan zimmet kaydı yok."
        />
      </Panel>
    );
  }

  return (
    <Panel>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-64">Dosya</TableHead>
            <TableHead className="w-40">Teslim Alan</TableHead>
            <TableHead>Amaç</TableHead>
            <TableHead className="w-28">Veriliş</TableHead>
            <TableHead className="w-44">İade Tarihi</TableHead>
            <TableHead className="w-28 text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell>
                <Link
                  href={`/dosya-islemleri?barcode=${encodeURIComponent(loan.folderBarcode)}`}
                  className="font-mono text-xs font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {loan.folderBarcode}
                </Link>
                <p className="mt-0.5 truncate text-sm">{loan.folderTitle}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  SDP {loan.filePlanCode}
                </p>
              </TableCell>
              <TableCell className="text-sm font-medium">
                {loan.borrowerSubjectId}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {loan.purpose}
              </TableCell>
              <TableCell className="text-sm tabular-nums text-muted-foreground">
                {dateFormat.format(new Date(loan.checkedOutAt))}
              </TableCell>
              <TableCell>
                <p className="text-sm tabular-nums">
                  {dateFormat.format(new Date(loan.dueAt))}
                </p>
                <div className="mt-1">
                  {loan.status === "Returned" ? (
                    <Badge variant="success">{loanStatusLabels.Returned}</Badge>
                  ) : loan.isOverdue ? (
                    <Badge variant="destructive">
                      {loan.daysOverdue} gün gecikti
                    </Badge>
                  ) : (
                    <Badge variant="info">{loanStatusLabels.Active}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {loan.status === "Returned" ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <ReturnLoanButton
                    loanId={loan.id}
                    folderBarcode={loan.folderBarcode}
                    borrowerSubjectId={loan.borrowerSubjectId}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
