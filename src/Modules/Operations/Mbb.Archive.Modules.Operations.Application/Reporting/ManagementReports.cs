using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Operations.Application.Reporting;

public enum ManagementReportPeriod { Daily, Weekly, Monthly }
public enum ReportRunStatus { Queued, Running, Completed, Failed }
public sealed record ManagementReportMetrics(long TotalDocuments, long NewDocuments, long OcrProcessed,
    long FailedProcessing, long SearchBacklog, long WorkflowSlaOverdue, long PhysicalLoansOverdue,
    long RetentionApproaching, long LegalHolds, long EvidenceFailures, long FixityFailures,
    long CriticalAlerts, double StorageUtilizationPercent);
public sealed record DailyOperationsReport(DateOnly Date, ManagementReportMetrics Metrics, IReadOnlyList<string> Actions);
public sealed record WeeklyOperationsReport(DateOnly WeekStarting, ManagementReportMetrics Metrics, IReadOnlyList<string> Actions);
public sealed record MonthlyExecutiveReport(int Year, int Month, ManagementReportMetrics Metrics, IReadOnlyList<string> Actions);
public sealed record QueueManagementReportCommand(ManagementReportPeriod Period, DateOnly PeriodStart, string RequestedBy) : ICommand<Guid>;

public interface IManagementReportSnapshotProvider
{
    Task<ManagementReportMetrics> CollectAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);
}
