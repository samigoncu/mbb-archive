using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Evidence.Application.Validations;

/// <param name="Kind">CmsSignature, Rfc3161Timestamp, PdfPades, EypPackage.</param>
/// <param name="Status">Pending, Valid, Invalid, Indeterminate.</param>
public sealed record GetEvidenceValidationsQuery(
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize,
    string? Kind = null,
    string? Status = null,
    Guid? DocumentId = null)
    : IQuery<PagedResult<EvidenceValidationListItem>>;

/// <summary>
/// Doğrulama künyesi. Ayrıntılı rapor JSON'u listede taşınmaz; tek kayıt
/// ucundan alınır.
/// </summary>
public sealed record EvidenceValidationListItem(
    Guid Id,
    Guid? DocumentId,
    Guid? DocumentVersionId,
    string Kind,
    string Status,
    string Provider,
    string Profile,
    string ContentSha256,
    DateTimeOffset StartedAt,
    DateTimeOffset? CompletedAt);
