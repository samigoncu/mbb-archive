using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.PhysicalArchive.Contracts;

public sealed record DocumentPhysicalFolder(Guid Id, string Barcode, string Title, string FilePlanCode);
public interface IDocumentPhysicalFiling
{
    Task<IReadOnlyList<DocumentPhysicalFolder>> GetAsync(Guid documentId, CancellationToken ct);
    Task<Result> ReplaceAsync(Guid documentId, IReadOnlyList<Guid> expectedFolderIds, IReadOnlyList<Guid> folderIds, CancellationToken ct);
}
