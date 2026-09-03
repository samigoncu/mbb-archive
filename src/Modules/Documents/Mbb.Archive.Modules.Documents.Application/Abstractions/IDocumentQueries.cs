using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Application.Documents.GetById;
using Mbb.Archive.Modules.Documents.Application.Documents.GetContent;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;
using Mbb.Archive.Modules.Documents.Application.Documents.List;

namespace Mbb.Archive.Modules.Documents.Application.Abstractions;

public interface IDocumentQueries
{
    Task<DocumentDetails?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<PagedResult<DocumentListItem>> GetPageAsync(
        PageRequest page,
        CancellationToken cancellationToken);

    Task<DocumentVersionContentDescriptor?> GetLatestVersionContentAsync(
        Guid documentId,
        CancellationToken cancellationToken);

    Task<DocumentIngestionDetails?> GetIngestionAsync(
        Guid documentId,
        Guid ingestionId,
        CancellationToken cancellationToken);
}
