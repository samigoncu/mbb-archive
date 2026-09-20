using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.AccessControl.Domain.Grants;

namespace Mbb.Archive.Modules.AccessControl.Application.Grants;

public static class GrantErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "access.grant_not_found",
        "Access grant was not found.");

    public static Error Invalid(string message)
        => Error.Validation("access.grant_invalid", message);
}

public sealed record CreateAccessGrantCommand(
    string ResourceType,
    string ResourceKey,
    string SubjectType,
    string SubjectKey,
    string Permission,
    DateTimeOffset? ValidFrom,
    DateTimeOffset? ValidTo,
    string? Reason) : ICommand<Guid>;

public sealed record RevokeAccessGrantCommand(Guid Id) : ICommand;

public sealed class AccessGrantCommandHandlers
{
    private readonly IAccessGrantRepository _grants;
    private readonly IUnitOfWork<AccessControlBoundary> _unitOfWork;
    private readonly ICurrentUserPermissions _currentUser;
    private readonly TimeProvider _timeProvider;

    public AccessGrantCommandHandlers(
        IAccessGrantRepository grants,
        IUnitOfWork<AccessControlBoundary> unitOfWork,
        ICurrentUserPermissions currentUser,
        TimeProvider timeProvider)
    {
        _grants = grants;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _timeProvider = timeProvider;
    }

    public async Task<Result<Guid>> Handle(
        CreateAccessGrantCommand command,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<GrantResourceType>(command.ResourceType, true, out var resourceType))
            return Result<Guid>.Failure(GrantErrors.Invalid($"Unknown resource type '{command.ResourceType}'."));

        if (!Enum.TryParse<GrantSubjectType>(command.SubjectType, true, out var subjectType))
            return Result<Guid>.Failure(GrantErrors.Invalid($"Unknown subject type '{command.SubjectType}'."));

        if (!Enum.TryParse<GrantPermission>(command.Permission, true, out var permission))
            return Result<Guid>.Failure(GrantErrors.Invalid($"Unknown permission '{command.Permission}'."));

        try
        {
            var now = _timeProvider.GetUtcNow();

            // Aynı üçlü için açık bir yetki varsa ikinci kayıt açılmaz;
            // yoksa aynı paylaşım defalarca verilip kaldırılamaz hâle gelir.
            var existing = await _grants.FindActiveAsync(
                resourceType,
                command.ResourceKey,
                subjectType,
                command.SubjectKey,
                permission,
                cancellationToken);

            if (existing is not null)
                return Result<Guid>.Success(existing.Id);

            var grant = AccessGrant.Create(
                resourceType,
                command.ResourceKey,
                subjectType,
                command.SubjectKey,
                permission,
                command.ValidFrom,
                command.ValidTo,
                _currentUser.Subject,
                command.Reason,
                now);

            await _grants.AddAsync(grant, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(grant.Id);
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<Guid>.Failure(GrantErrors.Invalid(exception.Message));
        }
    }

    public async Task<Result> Handle(
        RevokeAccessGrantCommand command,
        CancellationToken cancellationToken)
    {
        var grant = await _grants.GetAsync(command.Id, cancellationToken);

        if (grant is null)
            return Result.Failure(GrantErrors.NotFound);

        grant.Revoke(_timeProvider.GetUtcNow());
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public sealed record GetResourceGrantsQuery(string ResourceType, string ResourceKey)
    : IQuery<IReadOnlyList<AccessGrantSummary>>;

public sealed record GetSubjectGrantsQuery(GrantSubjectIdentity Identity)
    : IQuery<IReadOnlyList<AccessGrantSummary>>;

public sealed class AccessGrantQueryHandlers
{
    private readonly IAccessGrantQueries _queries;

    public AccessGrantQueryHandlers(IAccessGrantQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<AccessGrantSummary>>> Handle(
        GetResourceGrantsQuery query,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<GrantResourceType>(query.ResourceType, true, out var resourceType))
        {
            return Result<IReadOnlyList<AccessGrantSummary>>.Failure(
                GrantErrors.Invalid($"Unknown resource type '{query.ResourceType}'."));
        }

        return Result<IReadOnlyList<AccessGrantSummary>>.Success(
            await _queries.GetForResourceAsync(resourceType, query.ResourceKey, cancellationToken));
    }

    public async Task<Result<IReadOnlyList<AccessGrantSummary>>> Handle(
        GetSubjectGrantsQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<AccessGrantSummary>>.Success(
            await _queries.GetForSubjectAsync(query.Identity, cancellationToken));
}
