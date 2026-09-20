namespace Mbb.Archive.Modules.Collections.Application.Collections;

public sealed record CollectionListItem(
    Guid Id,
    string Name,
    string? Description,
    string OwnerSubject,
    bool IsShared,
    int ItemCount,
    DateTimeOffset CreatedAt);

public sealed record CollectionDetails(
    Guid Id,
    string Name,
    string? Description,
    string OwnerSubject,
    bool IsShared,
    DateTimeOffset CreatedAt,
    IReadOnlyList<CollectionItemDetails> Items);

public sealed record CollectionItemDetails(
    Guid DocumentId,
    string AddedBy,
    DateTimeOffset AddedAt);
