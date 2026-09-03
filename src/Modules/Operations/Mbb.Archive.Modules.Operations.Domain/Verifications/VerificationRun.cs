using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Operations.Domain.Verifications;

public enum VerificationRunStatus
{
    Running = 0,
    Passed = 1,
    Warning = 2,
    Failed = 3
}

public sealed class VerificationRun : AggregateRoot<Guid>
{
    private VerificationRun()
    {
    }

    private VerificationRun(
        Guid id,
        string kind,
        string requestedBy,
        DateTimeOffset startedAt)
        : base(id)
    {
        if (string.IsNullOrWhiteSpace(kind))
            throw new DomainRuleViolationException("Verification kind is required.");

        if (string.IsNullOrWhiteSpace(requestedBy))
            throw new DomainRuleViolationException("Verification requester is required.");

        Kind = kind.Trim().ToLowerInvariant();
        RequestedBy = requestedBy.Trim();
        StartedAt = startedAt;
        Status = VerificationRunStatus.Running;
    }

    public string Kind { get; private set; } = string.Empty;
    public string RequestedBy { get; private set; } = string.Empty;
    public VerificationRunStatus Status { get; private set; }
    public DateTimeOffset StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public long CheckedItems { get; private set; }
    public long FailedItems { get; private set; }
    public string Summary { get; private set; } = string.Empty;
    public string ResultsJson { get; private set; } = "[]";

    public static VerificationRun Start(
        string kind,
        string requestedBy,
        DateTimeOffset now)
        => new(
            Guid.CreateVersion7(),
            kind,
            requestedBy,
            now);

    public void Complete(
        VerificationRunStatus status,
        long checkedItems,
        long failedItems,
        string summary,
        string resultsJson,
        DateTimeOffset completedAt)
    {
        if (Status != VerificationRunStatus.Running)
            throw new DomainRuleViolationException("Verification run is already complete.");

        if (checkedItems < 0 || failedItems < 0 || failedItems > checkedItems)
            throw new DomainRuleViolationException("Verification counts are invalid.");

        Status = status;
        CheckedItems = checkedItems;
        FailedItems = failedItems;
        Summary = string.IsNullOrWhiteSpace(summary) ? "No summary." : summary.Trim();
        ResultsJson = string.IsNullOrWhiteSpace(resultsJson) ? "[]" : resultsJson;
        CompletedAt = completedAt;
    }
}
