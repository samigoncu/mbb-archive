using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetVersions;

public sealed record GetDocumentVersionsQuery(Guid DocumentId)
    : IQuery<IReadOnlyList<DocumentVersionSummary>>;

/// <summary>
/// Sürüm künyesi. Her sürüm değişmezdir; düzeltme yeni sürüm olarak eklenir.
/// Depolama anahtarı dışarı verilmez.
/// </summary>
public sealed record DocumentVersionSummary(
    int VersionNumber,
    string MimeType,
    long SizeBytes,
    string Sha256Hash,
    string CreatedBy,
    string? Reason,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CancelledAt = null,
    string? CancelledBy = null,
    string? CancellationReason = null);
