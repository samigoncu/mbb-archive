using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetById;

public sealed record GetDocumentByIdQuery(Guid Id) : IQuery<DocumentDetails>;

public sealed record DocumentDetails(
    Guid Id,
    string Title,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ArchivedAt,
    int VersionCount);
