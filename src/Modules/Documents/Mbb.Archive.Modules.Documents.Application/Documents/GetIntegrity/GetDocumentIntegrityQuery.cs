using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.GetIntegrity;

public sealed record GetDocumentIntegrityQuery(Guid DocumentId)
    : IQuery<DocumentIntegrityDetails>;

/// <summary>
/// Belgenin güncel sürümünün bütünlük künyesi. Depolama anahtarı bilinçli olarak
/// dışarı verilmez; istemcinin nesne adresine ihtiyacı yoktur.
/// </summary>
public sealed record DocumentIntegrityDetails(
    Guid DocumentId,
    int VersionNumber,
    string MimeType,
    long SizeBytes,
    string Sha256Hash,
    bool WormProtected = true,
    string WormMode = "Compliance",
    string FixityStatus = "Verified");
