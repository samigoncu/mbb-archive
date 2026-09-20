namespace Mbb.Archive.Modules.Documents.Contracts;

public interface IDocumentSearchDatesProvider
{
    Task<DocumentSearchDates?> GetAsync(Guid documentId, CancellationToken cancellationToken);
}

public sealed record DocumentSearchDates(DateTimeOffset CreatedAt, DateTimeOffset? IngestedAt);
