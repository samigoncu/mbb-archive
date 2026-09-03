using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Classification.Domain.FilePlans;

public sealed class FilePlan : AggregateRoot<FilePlanId>
{
    private readonly List<FilePlanItem> _items = [];
    private FilePlan() { }

    private FilePlan(
        FilePlanId id,
        string code,
        string name,
        string version,
        string authority,
        DateOnly effectiveFrom,
        DateOnly? effectiveTo)
        : base(id)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainRuleViolationException("File plan code is required.");
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainRuleViolationException("File plan name is required.");
        if (string.IsNullOrWhiteSpace(version))
            throw new DomainRuleViolationException("File plan version is required.");

        Code = code.Trim();
        Name = name.Trim();
        Version = version.Trim();
        Authority = authority.Trim();
        EffectiveFrom = effectiveFrom;
        EffectiveTo = effectiveTo;
        IsActive = true;
    }

    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Version { get; private set; } = string.Empty;
    public string Authority { get; private set; } = string.Empty;
    public DateOnly EffectiveFrom { get; private set; }
    public DateOnly? EffectiveTo { get; private set; }
    public bool IsActive { get; private set; }
    public IReadOnlyCollection<FilePlanItem> Items => _items.AsReadOnly();

    public static FilePlan Create(
        string code,
        string name,
        string version,
        string authority,
        DateOnly effectiveFrom,
        DateOnly? effectiveTo)
        => new(
            FilePlanId.New(),
            code,
            name,
            version,
            authority,
            effectiveFrom,
            effectiveTo);

    public FilePlanItem AddItem(
        FilePlanItemId? parentId,
        string code,
        string title,
        int level,
        bool isSelectable)
    {
        if (_items.Any(x => string.Equals(x.Code, code, StringComparison.OrdinalIgnoreCase)))
            throw new DomainRuleViolationException($"File plan item code '{code}' already exists in this plan.");

        if (parentId is not null && _items.All(x => x.Id != parentId.Value))
            throw new DomainRuleViolationException("Parent file plan item does not belong to this plan.");

        var item = new FilePlanItem(
            FilePlanItemId.New(),
            Id,
            parentId,
            code,
            title,
            level,
            isSelectable);

        _items.Add(item);
        return item;
    }
}
