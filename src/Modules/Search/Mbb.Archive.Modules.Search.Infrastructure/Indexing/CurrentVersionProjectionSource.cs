using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Processing.Contracts;
using Mbb.Archive.Modules.Search.Application.Abstractions;
namespace Mbb.Archive.Modules.Search.Infrastructure.Indexing;
internal sealed class CurrentVersionProjectionSource(ICurrentDocumentVersion documents, IProcessedVersionArtifacts artifacts) : ICurrentVersionProjectionSource
{
    public async Task<CurrentVersionProjection?> GetAsync(Guid id, CancellationToken ct)
    {
        var version = await documents.GetAsync(id, ct);
        if (version is null) return null;
        var processed = await artifacts.GetAsync(id, version.Id, ct);
        return new(version.Id, version.MimeType, processed?.TextKey, processed?.OcrKey);
    }
}
