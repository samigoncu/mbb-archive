using System.Text;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Processing.Contracts;
namespace Mbb.Archive.Modules.Processing.Application.Previews;

public sealed record DocumentVersionText(Guid DocumentId, int VersionNumber, bool HasText, string Text, int CharacterCount, bool IsTruncated);
public sealed class DocumentVersionTextHandler(IArchiveFilingCatalog documents, IProcessedVersionArtifacts artifacts, IPreviewArtifactStore storage)
{
    public const int MaximumCharacters = 200_000;
    public async Task<Result<DocumentVersionText>> Handle(Guid id, int number, CancellationToken ct)
    {
        if (number <= 0) return Result<DocumentVersionText>.Failure(Error.Validation("processing.invalid_version", "Sürüm numarası pozitif olmalıdır."));
        if (await documents.GetDocumentAsync(id, ct) is null)
            return Result<DocumentVersionText>.Failure(Missing());
        var version = await documents.GetDocumentVersionIdAsync(id, number, ct);
        if (version is null) return Result<DocumentVersionText>.Failure(Missing());
        var output = await artifacts.GetAsync(id, version.Value, ct);
        if (output?.TextKey is null) return Result<DocumentVersionText>.Success(new(id, number, false, "", 0, false));
        await using var stream = await storage.OpenReadAsync(output.TextKey, ct);
        if (stream is null) return Result<DocumentVersionText>.Failure(Error.Conflict("processing.text_missing", "Bu sürümün kayıtlı metin çıktısı depolamada bulunamadı."));
        using var reader = new StreamReader(stream, Encoding.UTF8, true, 4096, leaveOpen: true);
        var buffer = new char[MaximumCharacters + 1]; var read = 0;
        while (read < buffer.Length)
        {
            var count = await reader.ReadAsync(buffer.AsMemory(read), ct);
            if (count == 0) break;
            read += count;
        }
        var length = Math.Min(read, MaximumCharacters);
        return Result<DocumentVersionText>.Success(new(id, number, length > 0, new string(buffer, 0, length), length, read > MaximumCharacters));
    }
    private static Error Missing() => Error.NotFound("processing.version_missing", "Belge veya seçilen sürüm bulunamadı.");
}
