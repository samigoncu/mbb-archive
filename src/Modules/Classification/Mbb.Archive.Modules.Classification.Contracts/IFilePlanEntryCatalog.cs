namespace Mbb.Archive.Modules.Classification.Contracts;

public interface IFilePlanEntryCatalog
{
    Task<FilePlanEntry?> GetSelectableAsync(Guid planId, Guid itemId, DateOnly at, CancellationToken ct);
}
public sealed record FilePlanEntry(Guid PlanId, Guid ItemId, string Version, string Code, string Title);
