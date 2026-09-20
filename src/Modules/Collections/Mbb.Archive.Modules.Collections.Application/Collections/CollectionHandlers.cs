using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Collections.Application.Abstractions;
using Mbb.Archive.Modules.Collections.Domain.Collections;

namespace Mbb.Archive.Modules.Collections.Application.Collections;

public static class CollectionErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "collections.not_found",
        "Collection was not found.");

    public static readonly Error Forbidden = Error.NotFound(
        // Başkasının özel koleksiyonunun varlığını sızdırmamak için 404 dönülür.
        "collections.not_found",
        "Collection was not found.");

    public static Error Conflict(string message)
        => Error.Conflict("collections.conflict", message);
}

public sealed record CreateCollectionCommand(
    string Name,
    string? Description,
    bool IsShared) : ICommand<Guid>;

public sealed record RenameCollectionCommand(
    Guid Id,
    string Name,
    string? Description,
    bool IsShared) : ICommand;

public sealed record AddDocumentToCollectionCommand(
    Guid CollectionId,
    Guid DocumentId) : ICommand;

public sealed record RemoveDocumentFromCollectionCommand(
    Guid CollectionId,
    Guid DocumentId) : ICommand;

public sealed record DeleteCollectionCommand(Guid Id) : ICommand;

/// <summary>
/// Koleksiyon yazma işlemleri. Sahiplik kontrolü sunucuda yapılır; arayüzde
/// düğme gizlemek yetki sayılmaz (§21).
/// </summary>
public sealed class CollectionCommandHandlers
{
    private readonly ICollectionRepository _repository;
    private readonly IUnitOfWork<CollectionsBoundary> _unitOfWork;
    private readonly ICurrentUserPermissions _currentUser;
    private readonly TimeProvider _timeProvider;
    private readonly IDocumentVisibility _documentVisibility;

    public CollectionCommandHandlers(
        ICollectionRepository repository,
        IUnitOfWork<CollectionsBoundary> unitOfWork,
        ICurrentUserPermissions currentUser,
        TimeProvider timeProvider,
        IDocumentVisibility documentVisibility)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _timeProvider = timeProvider;
        _documentVisibility = documentVisibility;
    }

    public async Task<Result<Guid>> Handle(
        CreateCollectionCommand command,
        CancellationToken cancellationToken)
    {
        try
        {
            var collection = DocumentCollection.Create(
                command.Name,
                command.Description,
                _currentUser.Subject,
                command.IsShared,
                _timeProvider.GetUtcNow());

            await _repository.AddAsync(collection, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(collection.Id.Value);
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<Guid>.Failure(
                Error.Validation("collections.invalid", exception.Message));
        }
    }

    public Task<Result> Handle(
        RenameCollectionCommand command,
        CancellationToken cancellationToken)
        => MutateAsync(
            command.Id,
            collection =>
            {
                collection.Rename(command.Name, command.Description);
                collection.ChangeSharing(command.IsShared);
            },
            cancellationToken);

    public async Task<Result> Handle(
        AddDocumentToCollectionCommand command,
        CancellationToken cancellationToken)
    {
        var visible = await _documentVisibility.FilterAsync([command.DocumentId], cancellationToken);
        if (!visible.Contains(command.DocumentId))
            return Result.Failure(Error.NotFound("collections.document_not_found", "Belge bulunamadı veya erişim yetkiniz yok."));
        return await MutateAsync(
            command.CollectionId,
            collection => collection.AddDocument(command.DocumentId, _currentUser.Subject, _timeProvider.GetUtcNow()),
            cancellationToken);
    }

    public Task<Result> Handle(
        RemoveDocumentFromCollectionCommand command,
        CancellationToken cancellationToken)
        => MutateAsync(
            command.CollectionId,
            collection => collection.RemoveDocument(command.DocumentId),
            cancellationToken);

    public async Task<Result> Handle(
        DeleteCollectionCommand command,
        CancellationToken cancellationToken)
    {
        var collection = await _repository.GetAsync(
            new DocumentCollectionId(command.Id),
            cancellationToken);

        if (collection is null)
            return Result.Failure(CollectionErrors.NotFound);

        if (!await CanWriteAsync(collection, cancellationToken))
            return Result.Failure(CollectionErrors.Forbidden);

        // Koleksiyonun silinmesi belgeleri silmez; yalnızca gruplamayı kaldırır.
        _repository.Remove(collection);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private async Task<Result> MutateAsync(
        Guid id,
        Action<DocumentCollection> mutate,
        CancellationToken cancellationToken)
    {
        var collection = await _repository.GetAsync(
            new DocumentCollectionId(id),
            cancellationToken);

        if (collection is null)
            return Result.Failure(CollectionErrors.NotFound);

        if (!await CanWriteAsync(collection, cancellationToken))
            return Result.Failure(CollectionErrors.Forbidden);

        try
        {
            mutate(collection);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (DomainRuleViolationException exception)
        {
            return Result.Failure(CollectionErrors.Conflict(exception.Message));
        }
    }

    /// <summary>
    /// Yalnızca sahibi ya da tüm izinlere sahip özne değiştirebilir. Paylaşılan
    /// koleksiyon herkese okunur; yazma yetkisi paylaşımla gelmez.
    /// </summary>
    private async Task<bool> CanWriteAsync(
        DocumentCollection collection,
        CancellationToken cancellationToken)
        => collection.OwnerSubject == _currentUser.Subject
            || await _currentUser.HasAllPermissionsAsync(cancellationToken);
}

public sealed record GetCollectionsQuery(int Page = 1, int PageSize = 50)
    : IQuery<PagedResult<CollectionListItem>>;

public sealed record GetCollectionQuery(Guid Id) : IQuery<CollectionDetails>;

public sealed record GetDocumentCollectionsQuery(Guid DocumentId)
    : IQuery<IReadOnlyList<CollectionListItem>>;

public sealed class CollectionQueryHandlers
{
    private readonly ICollectionQueries _queries;
    private readonly ICurrentUserPermissions _currentUser;
    private readonly IDocumentVisibility _visibility;

    public CollectionQueryHandlers(
        ICollectionQueries queries,
        ICurrentUserPermissions currentUser,
        IDocumentVisibility visibility)
    {
        _queries = queries;
        _currentUser = currentUser;
        _visibility = visibility;
    }

    public async Task<Result<PagedResult<CollectionListItem>>> Handle(
        GetCollectionsQuery query,
        CancellationToken cancellationToken)
    {
        var pageResult = PageRequest.Create(query.Page, query.PageSize);

        if (pageResult.IsFailure)
            return Result<PagedResult<CollectionListItem>>.Failure(pageResult.Error);

        var result = await _queries.GetPageAsync(
            pageResult.Value,
            _currentUser.Subject,
            await _currentUser.HasAllPermissionsAsync(cancellationToken),
            cancellationToken);

        return Result<PagedResult<CollectionListItem>>.Success(result);
    }

    public async Task<Result<CollectionDetails>> Handle(
        GetCollectionQuery query,
        CancellationToken cancellationToken)
    {
        var details = await _queries.GetDetailsAsync(
            query.Id,
            _currentUser.Subject,
            await _currentUser.HasAllPermissionsAsync(cancellationToken),
            cancellationToken);

        if (details is null)
            return Result<CollectionDetails>.Failure(CollectionErrors.NotFound);

        // Paylaşılan bir koleksiyon başka birimin belgelerini içerebilir;
        // koleksiyona erişim, içindeki belgeye erişim demek değildir.
        var visible = await _visibility.FilterAsync(
            details.Items.Select(x => x.DocumentId).ToArray(),
            cancellationToken);

        return Result<CollectionDetails>.Success(
            details with
            {
                Items = details.Items
                    .Where(x => visible.Contains(x.DocumentId))
                    .ToArray()
            });
    }

    public async Task<Result<IReadOnlyList<CollectionListItem>>> Handle(
        GetDocumentCollectionsQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<CollectionListItem>>.Success(
            await _queries.GetForDocumentAsync(
                query.DocumentId,
                _currentUser.Subject,
                await _currentUser.HasAllPermissionsAsync(cancellationToken),
                cancellationToken));
}
