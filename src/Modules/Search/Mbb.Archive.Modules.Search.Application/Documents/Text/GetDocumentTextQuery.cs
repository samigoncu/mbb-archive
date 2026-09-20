using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Search.Application.Documents.Text;

public sealed record GetDocumentTextQuery(Guid DocumentId, int MaxCharacters = 200_000)
    : IQuery<DocumentTextResult>;

/// <param name="IsTruncated">Metin `MaxCharacters` sınırında kesildiyse true.</param>
public sealed record DocumentTextResult(
    Guid DocumentId,
    bool HasText,
    string Text,
    int CharacterCount,
    bool IsTruncated);
