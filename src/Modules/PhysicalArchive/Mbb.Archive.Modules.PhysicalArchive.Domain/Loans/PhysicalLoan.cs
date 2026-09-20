using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;

public enum PhysicalLoanStatus
{
    Active = 0,
    Returned = 1,
    Overdue = 2
}

public sealed class PhysicalLoan : AggregateRoot<Guid>
{
    private PhysicalLoan() { }

    private PhysicalLoan(
        Guid id,
        Guid folderId,
        string borrowerSubjectId,
        string purpose,
        DateTimeOffset checkedOutAt,
        DateTimeOffset dueAt,
        string? checkedOutBy = null) : base(id)
    {
        if (string.IsNullOrWhiteSpace(borrowerSubjectId))
            throw new DomainRuleViolationException("Borrower subject id is required.");
        if (string.IsNullOrWhiteSpace(purpose))
            throw new DomainRuleViolationException("Loan purpose is required.");
        if (dueAt <= checkedOutAt)
            throw new DomainRuleViolationException("Due date must be after checkout.");

        FolderId = folderId;
        BorrowerSubjectId = borrowerSubjectId.Trim();
        CheckedOutBy = string.IsNullOrWhiteSpace(checkedOutBy) ? "Arşiv Görevlisi" : checkedOutBy.Trim();
        Purpose = purpose.Trim();
        CheckedOutAt = checkedOutAt.ToUniversalTime();
        DueAt = dueAt.ToUniversalTime();
        Status = PhysicalLoanStatus.Active;
    }

    public Guid FolderId { get; private set; }
    public string BorrowerSubjectId { get; private set; } = string.Empty;
    public string CheckedOutBy { get; private set; } = string.Empty;
    public string Purpose { get; private set; } = string.Empty;
    public DateTimeOffset CheckedOutAt { get; private set; }
    public DateTimeOffset DueAt { get; private set; }
    public DateTimeOffset? ReturnedAt { get; private set; }
    public string? ReturnNote { get; private set; }
    public PhysicalLoanStatus Status { get; private set; }

    public static PhysicalLoan Start(
        Guid folderId,
        string borrowerSubjectId,
        string purpose,
        DateTimeOffset now,
        DateTimeOffset dueAt,
        string? checkedOutBy = null)
        => new(
            Guid.CreateVersion7(),
            folderId,
            borrowerSubjectId,
            purpose,
            now,
            dueAt,
            checkedOutBy);

    public void Return(DateTimeOffset now, string? returnNote = null)
    {
        if (Status == PhysicalLoanStatus.Returned)
            return;

        ReturnedAt = now.ToUniversalTime();
        ReturnNote = returnNote?.Trim();
        Status = PhysicalLoanStatus.Returned;
    }

    public void MarkOverdue(DateTimeOffset now)
    {
        if (Status == PhysicalLoanStatus.Active && now > DueAt)
            Status = PhysicalLoanStatus.Overdue;
    }
}
