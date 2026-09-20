using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
using Mbb.Archive.Modules.Organization.Domain.Units;

namespace Mbb.Archive.Modules.Organization.Application.Units;

public static class OrganizationErrors
{
    public static readonly Error UnitNotFound = Error.NotFound(
        "organization.unit_not_found",
        "Organization unit was not found.");

    public static Error Invalid(string message)
        => Error.Validation("organization.invalid", message);

    public static Error Conflict(string message)
        => Error.Conflict("organization.conflict", message);
}

public sealed record CreateUnitCommand(
    string Code,
    string Name,
    string? ShortName,
    Guid? ParentId,
    string? ExternalReference,
    /// <summary>Teşkilat seviyesi kodu; boş bırakılabilir.</summary>
    string? TypeCode = null) : ICommand<Guid>;

/// <summary>Var olan bir birimin teşkilat seviyesini değiştirir.</summary>
public sealed record SetUnitTypeCommand(Guid Id, string? TypeCode) : ICommand;

public sealed record RenameUnitCommand(Guid Id, string Name, string? ShortName) : ICommand;

public sealed record MoveUnitCommand(Guid Id, Guid? NewParentId) : ICommand;

public sealed record SetUnitActiveCommand(Guid Id, bool IsActive) : ICommand;

public sealed record AssignMembershipCommand(
    string SubjectId,
    Guid UnitId,
    bool IsPrimary) : ICommand<Guid>;

public sealed record RemoveMembershipCommand(string SubjectId, Guid UnitId) : ICommand;

public sealed class OrganizationCommandHandlers
{
    private readonly IOrganizationRepository _repository;
    private readonly IUnitOfWork<OrganizationBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;
    private readonly IEnumerable<Mbb.Archive.BuildingBlocks.Application.Security.IOrganizationUnitUsage> _usage;
    private readonly IUnitTypeStore _unitTypes;

    public OrganizationCommandHandlers(
        IOrganizationRepository repository,
        IUnitOfWork<OrganizationBoundary> unitOfWork,
        TimeProvider timeProvider, IEnumerable<Mbb.Archive.BuildingBlocks.Application.Security.IOrganizationUnitUsage> usage,
        IUnitTypeStore unitTypes)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
        _usage = usage;
        _unitTypes = unitTypes;
    }

    /// <summary>
    /// Birimin seviyesini belirler ve üst birimle kademe tutarlılığını doğrular.
    /// </summary>
    public async Task<Result> Handle(SetUnitTypeCommand command, CancellationToken cancellationToken)
    {
        var unit = await _repository.GetUnitAsync(new OrganizationUnitId(command.Id), cancellationToken);
        if (unit is null) return Result.Failure(OrganizationErrors.UnitNotFound);

        var result = await ApplyTypeAsync(unit, command.TypeCode, cancellationToken);
        if (result.IsFailure) return result;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    /// <remarks>
    /// Üst birimin seviyesi atanmamışsa kademe kuralı uygulanmaz: henüz
    /// seviyelendirilmemiş bir ağaç yukarıdan aşağı doldurulabilmelidir.
    /// </remarks>
    private async Task<Result> ApplyTypeAsync(
        OrganizationUnit unit, string? typeCode, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(typeCode))
        {
            unit.AssignType(null, null);
            return Result.Success();
        }

        var definition = await _unitTypes.FindAsync(typeCode.Trim(), cancellationToken);
        if (definition is null)
        {
            return Result.Failure(Error.NotFound(
                "organization.unit_type_not_found", "Birim seviyesi bulunamadı."));
        }

        OrganizationUnitTypeDefinition? parentType = null;

        if (unit.ParentId is { } parentId)
        {
            var parent = await _repository.GetUnitAsync(parentId, cancellationToken);
            if (parent?.TypeCode is { } parentTypeCode)
                parentType = await _unitTypes.FindAsync(parentTypeCode, cancellationToken);
        }

        try { unit.AssignType(definition, parentType); }
        catch (DomainRuleViolationException exception)
        {
            return Result.Failure(OrganizationErrors.Invalid(exception.Message));
        }

        return Result.Success();
    }

    public async Task<Result<Guid>> Handle(
        CreateUnitCommand command,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.Code) || string.IsNullOrWhiteSpace(command.Name))
            return Result<Guid>.Failure(Error.Validation("organization.invalid_unit", "Birim kodu ve adı zorunludur."));
        var existing = await _repository.FindUnitByCodeAsync(command.Code, cancellationToken);

        if (existing is not null)
            return Result<Guid>.Failure(OrganizationErrors.Conflict($"Unit code '{command.Code}' is already in use."));

        try
        {
            var now = _timeProvider.GetUtcNow();
            OrganizationUnit unit;

            if (command.ParentId is { } parentId)
            {
                var parent = await _repository.GetUnitAsync(
                    new OrganizationUnitId(parentId),
                    cancellationToken);

                if (parent is null)
                    return Result<Guid>.Failure(OrganizationErrors.UnitNotFound);

                unit = parent.CreateChild(
                    command.Code,
                    command.Name,
                    command.ShortName,
                    command.ExternalReference,
                    now);
            }
            else
            {
                unit = OrganizationUnit.CreateRoot(
                    command.Code,
                    command.Name,
                    command.ShortName,
                    command.ExternalReference,
                    now);
            }

            var typed = await ApplyTypeAsync(unit, command.TypeCode, cancellationToken);
            if (typed.IsFailure) return Result<Guid>.Failure(typed.Error);

            await _repository.AddUnitAsync(unit, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(unit.Id.Value);
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<Guid>.Failure(OrganizationErrors.Invalid(exception.Message));
        }
    }

    public Task<Result> Handle(RenameUnitCommand command, CancellationToken cancellationToken)
        => MutateAsync(command.Id, unit => unit.Rename(command.Name, command.ShortName), cancellationToken);

    public Task<Result> Handle(SetUnitActiveCommand command, CancellationToken cancellationToken)
        => MutateAsync(
            command.Id,
            unit =>
            {
                if (command.IsActive) unit.Activate(); else unit.Deactivate();
            },
            cancellationToken);

    /// <summary>
    /// Alt ağacı taşır ve tüm torunların materyalize yolunu tazeler. Yol
    /// güncellenmezse kapsam süzgeci yanlış birim eşler — bu yüzden aynı
    /// transaction içinde yapılır.
    /// </summary>
    public async Task<Result> Handle(
        MoveUnitCommand command,
        CancellationToken cancellationToken)
    {
        var unit = await _repository.GetUnitAsync(
            new OrganizationUnitId(command.Id),
            cancellationToken);

        if (unit is null)
            return Result.Failure(OrganizationErrors.UnitNotFound);

        OrganizationUnit? newParent = null;

        if (command.NewParentId is { } parentId)
        {
            newParent = await _repository.GetUnitAsync(
                new OrganizationUnitId(parentId),
                cancellationToken);

            if (newParent is null)
                return Result.Failure(OrganizationErrors.UnitNotFound);
        }

        try
        {
            var oldPath = unit.Path;
            var descendants = await _repository.GetDescendantsAsync(oldPath, cancellationToken);

            foreach (var member in descendants)
                foreach (var contributor in _usage)
                    if (await contributor.HasReferencesAsync(member.Id.Value, cancellationToken))
                        return Result.Failure(OrganizationErrors.Conflict("Arşiv kaydı bulunan birim veya alt ağacı taşınamaz. Mevcut erişim yolları korunmalıdır."));
            unit.MoveTo(newParent);

            foreach (var descendant in descendants.Where(x => x.Id != unit.Id))
                descendant.RewritePath(oldPath, unit.Path);

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (DomainRuleViolationException exception)
        {
            return Result.Failure(OrganizationErrors.Conflict(exception.Message));
        }
    }

    /// <summary>
    /// Üyelik atar. Birincil işaretlenirse öznenin diğer birincil üyelikleri
    /// düşürülür; belgenin sahibi birim tek olmalıdır.
    /// </summary>
    public async Task<Result<Guid>> Handle(
        AssignMembershipCommand command,
        CancellationToken cancellationToken)
    {
        var unit = await _repository.GetUnitAsync(
            new OrganizationUnitId(command.UnitId),
            cancellationToken);

        if (unit is null)
            return Result<Guid>.Failure(OrganizationErrors.UnitNotFound);

        if (!unit.IsActive) return Result<Guid>.Failure(OrganizationErrors.Invalid("Pasif birime üyelik eklenemez."));
        var memberships = await _repository.GetMembershipsAsync(command.SubjectId, cancellationToken);
        var existing = memberships.FirstOrDefault(x => x.UnitId == unit.Id);

        if (command.IsPrimary)
            foreach (var membership in memberships)
                membership.SetPrimary(false);

        if (existing is not null)
        {
            existing.SetPrimary(command.IsPrimary);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result<Guid>.Success(existing.Id);
        }

        try
        {
            var created = UnitMembership.Create(
                command.SubjectId,
                unit.Id,
                command.IsPrimary,
                MembershipSource.Manual,
                _timeProvider.GetUtcNow());

            await _repository.AddMembershipAsync(created, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(created.Id);
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<Guid>.Failure(OrganizationErrors.Invalid(exception.Message));
        }
    }

    public async Task<Result> Handle(
        RemoveMembershipCommand command,
        CancellationToken cancellationToken)
    {
        var memberships = await _repository.GetMembershipsAsync(command.SubjectId, cancellationToken);
        var target = memberships.FirstOrDefault(x => x.UnitId.Value == command.UnitId);

        if (target is null)
            return Result.Success();

        _repository.RemoveMembership(target);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private async Task<Result> MutateAsync(
        Guid id,
        Action<OrganizationUnit> mutate,
        CancellationToken cancellationToken)
    {
        var unit = await _repository.GetUnitAsync(new OrganizationUnitId(id), cancellationToken);

        if (unit is null)
            return Result.Failure(OrganizationErrors.UnitNotFound);

        try
        {
            mutate(unit);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (DomainRuleViolationException exception)
        {
            return Result.Failure(OrganizationErrors.Invalid(exception.Message));
        }
    }
}

public sealed record GetUnitTreeQuery(bool IncludeInactive = false)
    : IQuery<IReadOnlyList<OrganizationUnitSummary>>;

public sealed record GetUnitMembersQuery(Guid UnitId)
    : IQuery<IReadOnlyList<UnitMembershipSummary>>;

public sealed record GetSubjectMembershipsQuery(string SubjectId)
    : IQuery<IReadOnlyList<UnitMembershipSummary>>;

public sealed class OrganizationQueryHandlers
{
    private readonly IOrganizationQueries _queries;

    public OrganizationQueryHandlers(IOrganizationQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<OrganizationUnitSummary>>> Handle(
        GetUnitTreeQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<OrganizationUnitSummary>>.Success(
            await _queries.GetTreeAsync(query.IncludeInactive, cancellationToken));

    public async Task<Result<IReadOnlyList<UnitMembershipSummary>>> Handle(
        GetUnitMembersQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<UnitMembershipSummary>>.Success(
            await _queries.GetUnitMembersAsync(query.UnitId, cancellationToken));

    public async Task<Result<IReadOnlyList<UnitMembershipSummary>>> Handle(
        GetSubjectMembershipsQuery query,
        CancellationToken cancellationToken)
        => Result<IReadOnlyList<UnitMembershipSummary>>.Success(
            await _queries.GetSubjectMembershipsAsync(query.SubjectId, cancellationToken));
}
