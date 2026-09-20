using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Classification.Contracts;

public sealed record PrimaryClassification(Guid PlanId, Guid ItemId, string Code, string Title, string PlanCode, string PlanName);
public interface IDocumentClassificationFiling
{
    Task<PrimaryClassification?> GetPrimaryAsync(Guid documentId, CancellationToken ct);
    Task<Result> ReplacePrimaryAsync(Guid documentId, Guid planId, Guid itemId, CancellationToken ct);
}
