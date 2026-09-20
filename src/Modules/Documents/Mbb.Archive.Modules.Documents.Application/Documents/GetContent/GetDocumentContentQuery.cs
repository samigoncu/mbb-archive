using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetContent;

/// <summary>Seçilen sürümün, belirtilmezse güncel sürümün orijinal içeriği.</summary>
public sealed record GetDocumentContentQuery(Guid DocumentId, int? VersionNumber = null)
    : IQuery<DocumentContent>;

public sealed record DocumentVersionContentDescriptor(
    int VersionNumber,
    string StorageKey,
    string MimeType,
    long SizeBytes,
    string Sha256Hash,
    string? StorageVersionId = null);

/// <summary>Stream'in sahipliği çağırana aittir; response yazıldıktan sonra dispose edilir.</summary>
public sealed record DocumentContent(
    Stream Stream,
    string MimeType,
    long SizeBytes,
    string FileName);
