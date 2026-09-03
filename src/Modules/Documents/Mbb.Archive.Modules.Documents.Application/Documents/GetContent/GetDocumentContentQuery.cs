using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetContent;

/// <summary>Belgenin en güncel versiyonunun orijinal içeriğini okumak için istek.</summary>
public sealed record GetDocumentContentQuery(Guid DocumentId)
    : IQuery<DocumentContent>;

public sealed record DocumentVersionContentDescriptor(
    int VersionNumber,
    string StorageKey,
    string MimeType,
    long SizeBytes,
    string Sha256Hash);

/// <summary>Stream'in sahipliği çağırana aittir; response yazıldıktan sonra dispose edilir.</summary>
public sealed record DocumentContent(
    Stream Stream,
    string MimeType,
    long SizeBytes,
    string FileName);
