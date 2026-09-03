using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

public enum ArchiveLocationType
{
    InstitutionArchive = 0,
    Building = 1,
    ArchiveArea = 2,
    Room = 3,
    Aisle = 4,
    Cabinet = 5,
    Shelf = 6,
    Box = 7
}

public sealed class ArchiveLocation : AggregateRoot<Guid>
{
    private ArchiveLocation() { }

    private ArchiveLocation(
        Guid id,
        Guid? parentId,
        ArchiveLocationType type,
        string code,
        string name,
        string barcode,
        int? capacity,
        DateTimeOffset createdAt) : base(id)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainRuleViolationException("Location code is required.");
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainRuleViolationException("Location name is required.");
        if (string.IsNullOrWhiteSpace(barcode))
            throw new DomainRuleViolationException("Location barcode is required.");
        if (capacity is <= 0)
            throw new DomainRuleViolationException("Capacity must be greater than zero.");

        ParentId = parentId;
        Type = type;
        Code = code.Trim().ToUpperInvariant();
        Name = name.Trim();
        Barcode = barcode.Trim().ToUpperInvariant();
        Capacity = capacity;
        IsActive = true;
        CreatedAt = createdAt;
    }

    public Guid? ParentId { get; private set; }
    public ArchiveLocationType Type { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Barcode { get; private set; } = string.Empty;
    public int? Capacity { get; private set; }
    public bool IsActive { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static ArchiveLocation CreateRoot(
        string code,
        string name,
        string barcode,
        DateTimeOffset now)
        => new(
            Guid.CreateVersion7(),
            null,
            ArchiveLocationType.InstitutionArchive,
            code,
            name,
            barcode,
            null,
            now);

    public static ArchiveLocation CreateChild(
        ArchiveLocation parent,
        ArchiveLocationType type,
        string code,
        string name,
        string barcode,
        int? capacity,
        DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(parent);

        if (!parent.IsActive)
            throw new DomainRuleViolationException("Inactive parent location cannot receive children.");

        if (!Allowed(parent.Type, type))
            throw new DomainRuleViolationException($"{type} cannot be created under {parent.Type}.");

        return new(
            Guid.CreateVersion7(),
            parent.Id,
            type,
            code,
            name,
            barcode,
            capacity,
            now);
    }

    public bool CanStoreFolder()
        => IsActive && Type is ArchiveLocationType.Shelf or ArchiveLocationType.Box;

    public void Deactivate() => IsActive = false;

    private static bool Allowed(
        ArchiveLocationType parent,
        ArchiveLocationType child)
        => (parent, child) switch
        {
            (ArchiveLocationType.InstitutionArchive, ArchiveLocationType.Building) => true,
            (ArchiveLocationType.Building, ArchiveLocationType.ArchiveArea) => true,
            (ArchiveLocationType.ArchiveArea, ArchiveLocationType.Room) => true,
            (ArchiveLocationType.Room, ArchiveLocationType.Aisle) => true,
            (ArchiveLocationType.Aisle, ArchiveLocationType.Cabinet) => true,
            (ArchiveLocationType.Cabinet, ArchiveLocationType.Shelf) => true,
            (ArchiveLocationType.Shelf, ArchiveLocationType.Box) => true,
            _ => false
        };
}
