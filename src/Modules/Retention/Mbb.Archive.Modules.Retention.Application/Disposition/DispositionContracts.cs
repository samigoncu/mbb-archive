using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Retention.Domain.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.Application.Disposition;

public interface IDispositionRepository
{
    Task<DispositionProcess?> GetAsync(Guid id, CancellationToken ct);
    Task<bool> HasOpenProcessAsync(Guid caseId, CancellationToken ct);
    Task AddAsync(DispositionProcess process, CancellationToken ct);
    Task<PagedResult<DispositionProcess>> ListAsync(PageRequest page, string? status, CancellationToken ct);
}

public sealed record CreateDispositionCommand(Guid RequestId, Guid RetentionCaseId,
    DispositionAction Action, string Reason, string CommissionReference) : ICommand<Guid>;
public enum DispositionOperation { Submit, Review, Approve, AcceptTransfer, KeepPermanently, ExecuteDestruction }
public sealed record AdvanceDispositionCommand(Guid Id, long ExpectedVersion, DispositionOperation Operation,
    string Reason = "", bool Approved = false, string Reference = "", string ReceivingArchive = "",
    Guid? EvidenceDocumentId = null, Guid? EvidenceVersionId = null, string Method = "", string Location = "",
    string Witnesses = "", DateTimeOffset? ExecutedAt = null) : ICommand;
public sealed record ConfigureCommissionCommand(Guid Id, long ExpectedVersion, IReadOnlyList<string> Members,
    DateTimeOffset ValidFrom, DateTimeOffset ValidUntil) : ICommand;
public sealed record DelegateCommissionCommand(Guid Id, long ExpectedVersion, string Member, string Delegate,
    string Reference, DateTimeOffset ValidFrom, DateTimeOffset ValidUntil) : ICommand;
public sealed record CommissionMemberDetails(string Subject, string? DelegateSubject, string? DelegationReference,
    DateTimeOffset? DelegateFrom, DateTimeOffset? DelegateUntil);
public sealed record DispositionReviewDetails(Guid Id, string Actor, bool Approved, string Reason, DateTimeOffset ReviewedAt);
public sealed record DispositionDetails(Guid Id, Guid RetentionCaseId, Guid DocumentId, string Action,
    string Status, string Reason, string CommissionReference, string CreatedBy, DateTimeOffset CreatedAt,
    int RequiredReviews, string? ApprovedBy, DateTimeOffset? ApprovedAt, string? ApprovalReference,
    string? CompletedBy, DateTimeOffset? CompletedAt, string? ReceivingArchive, string? ReceiptReference,
    long Version, IReadOnlyList<DispositionReviewDetails> Reviews,
    DateTimeOffset? CommissionValidFrom, DateTimeOffset? CommissionValidUntil, IReadOnlyList<CommissionMemberDetails> Members,
    Guid? TransferPackageId, string? TransferManifestSha256, string? TransferPackageSha256, long? TransferPackageSize,
    string? PackageCreatedBy, DateTimeOffset? PackageCreatedAt, string? PackageVerifiedBy, DateTimeOffset? PackageVerifiedAt,
    Guid? ExecutionEvidenceDocumentId, Guid? ExecutionEvidenceVersionId, string? ExecutionEvidenceSha256,
    string? ExecutionMethod, string? ExecutionLocation, string? ExecutionWitnesses, DateTimeOffset? PhysicalExecutedAt)
{
    public static DispositionDetails From(DispositionProcess process) => new(
        process.Id, process.RetentionCaseId, process.DocumentId, process.Action.ToString(), process.Status.ToString(),
        process.Reason, process.CommissionReference, process.CreatedBy, process.CreatedAt, process.RequiredReviews,
        process.ApprovedBy, process.ApprovedAt, process.ApprovalReference, process.CompletedBy, process.CompletedAt,
        process.ReceivingArchive, process.ReceiptReference, process.ConcurrencyVersion,
        process.Reviews.OrderBy(x => x.ReviewedAt).Select(x => new DispositionReviewDetails(x.Id, x.Actor, x.Approved, x.Reason, x.ReviewedAt)).ToArray(),
        process.CommissionValidFrom, process.CommissionValidUntil,
        process.Members.Select(x => new CommissionMemberDetails(x.Subject, x.DelegateSubject, x.DelegationReference, x.DelegateFrom, x.DelegateUntil)).ToArray(),
        process.TransferPackageId, process.TransferManifestSha256, process.TransferPackageSha256, process.TransferPackageSize,
        process.PackageCreatedBy, process.PackageCreatedAt, process.PackageVerifiedBy, process.PackageVerifiedAt,
        process.ExecutionEvidenceDocumentId, process.ExecutionEvidenceVersionId, process.ExecutionEvidenceSha256,
        process.ExecutionMethod, process.ExecutionLocation, process.ExecutionWitnesses, process.PhysicalExecutedAt);
}
