using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Documents.GetById;
using Mbb.Archive.Modules.Documents.Application.Documents.GetContent;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;
using Mbb.Archive.Modules.Documents.Application.Documents.GetVersions;
using Mbb.Archive.Modules.Documents.Application.Documents.List;

namespace Mbb.Archive.Modules.Documents.Application.Abstractions;

public interface IDocumentQueries
{
    /// <summary>
    /// Kapsam dışındaki belge <c>null</c> döner — "yasak" ile "yok" arasındaki
    /// farkı sızdırmamak için ayrı bir hata üretilmez.
    /// </summary>
    Task<DocumentDetails?> GetByIdAsync(
        Guid id,
        AccessScope scope,
        CancellationToken cancellationToken);

    Task<PagedResult<DocumentListItem>> GetPageAsync(
        PageRequest page,
        DocumentListFilter filter,
        DocumentListSort sort,
        AccessScope scope,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<DocumentVersionSummary>> GetVersionsAsync(
        Guid documentId,
        AccessScope scope,
        CancellationToken cancellationToken);

    Task<DocumentVersionContentDescriptor?> GetLatestVersionContentAsync(
        Guid documentId,
        AccessScope scope,
        CancellationToken cancellationToken);

    Task<DocumentVersionContentDescriptor?> GetVersionContentAsync(
        Guid documentId,
        int? versionNumber,
        AccessScope scope,
        CancellationToken cancellationToken);

    Task<DocumentIngestionDetails?> GetIngestionAsync(
        Guid documentId,
        Guid ingestionId,
        AccessScope scope,
        CancellationToken cancellationToken);
}
