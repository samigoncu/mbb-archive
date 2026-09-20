using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

/// <summary>
/// Fiziksel yerleşimde tek bir düğüm: bina, oda, dolap, raf…
/// </summary>
/// <remarks>
/// Seviye artık sabit bir enum değil, <see cref="ArchiveLocationTypeDefinition"/>
/// kataloğundaki bir kod. Konum yalnız kodu taşır; iç içe geçme ve klasör
/// taşıma kuralları tanımdan okunur ve kurum kataloğu değiştirerek yerleşim
/// kalıbını kendi yapısına uydurabilir.
/// </remarks>
public sealed class ArchiveLocation : AggregateRoot<Guid>
{
    private ArchiveLocation() { }

    private ArchiveLocation(
        Guid id,
        Guid? parentId,
        string typeCode,
        string code,
        string name,
        string barcode,
        int? capacity,
        DateTimeOffset createdAt) : base(id)
    {
        ParentId = parentId;
        TypeCode = typeCode;
        Apply(code, name, barcode, capacity);
        IsActive = true;
        CreatedAt = createdAt;
    }

    public Guid? ParentId { get; private set; }

    /// <summary>Katalogdaki seviye kodu (Shelf, Box, kuruma özel bir kod…).</summary>
    public string TypeCode { get; private set; } = string.Empty;

    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Barcode { get; private set; } = string.Empty;
    public int? Capacity { get; private set; }
    public bool IsActive { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static ArchiveLocation CreateRoot(
        ArchiveLocationTypeDefinition type,
        string code,
        string name,
        string barcode,
        DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(type);

        if (!type.IsActive)
            throw new DomainRuleViolationException("Pasif seviyeye konum açılamaz.");

        return new(Guid.CreateVersion7(), null, type.Code, code, name, barcode, null, now);
    }

    public static ArchiveLocation CreateChild(
        ArchiveLocation parent,
        ArchiveLocationTypeDefinition parentType,
        ArchiveLocationTypeDefinition type,
        string code,
        string name,
        string barcode,
        int? capacity,
        DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(parent);
        ArgumentNullException.ThrowIfNull(parentType);
        ArgumentNullException.ThrowIfNull(type);

        if (!parent.IsActive)
            throw new DomainRuleViolationException("Inactive parent location cannot receive children.");
        if (!type.IsActive)
            throw new DomainRuleViolationException("Pasif seviyeye konum açılamaz.");
        if (!type.CanNestUnder(parentType))
            throw new DomainRuleViolationException($"{type.Name}, {parentType.Name} altına açılamaz; alt seviye daha derin olmalıdır.");
        if (capacity is not null && !type.AllowsCapacity)
            throw new DomainRuleViolationException($"{type.Name} seviyesinde kapasite tanımlanmaz.");

        return new(Guid.CreateVersion7(), parent.Id, type.Code, code, name, barcode, capacity, now);
    }

    /// <summary>Klasör yalnız aktif ve klasör taşıyabilen bir seviyeye konur.</summary>
    public bool CanStoreFolder(ArchiveLocationTypeDefinition type)
    {
        ArgumentNullException.ThrowIfNull(type);
        return IsActive && type.Code == TypeCode && type.CanStoreFolder;
    }

    /// <summary>
    /// Tanım düzeltmesi: kod, ad, barkod ve kapasite güncellenir.
    /// </summary>
    /// <remarks>
    /// Seviye ve üst düğüm değiştirilemez: ikisi de hiyerarşinin şeklini
    /// belirler, değişmeleri altındaki klasörlerin fiziksel adresini sessizce
    /// kaydırırdı. Taşıma gerekiyorsa konum kapatılıp yenisi açılır.
    /// </remarks>
    public void Update(ArchiveLocationTypeDefinition type, string code, string name, string barcode, int? capacity)
    {
        ArgumentNullException.ThrowIfNull(type);

        if (capacity is not null && !type.AllowsCapacity)
            throw new DomainRuleViolationException($"{type.Name} seviyesinde kapasite tanımlanmaz.");

        Apply(code, name, barcode, capacity);
    }

    /// <summary>Pasif konuma yeni klasör yerleştirilemez; mevcut klasörler yerinde kalır.</summary>
    public void Deactivate() => IsActive = false;

    public void Reactivate() => IsActive = true;

    private void Apply(string code, string name, string barcode, int? capacity)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainRuleViolationException("Location code is required.");
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainRuleViolationException("Location name is required.");
        if (string.IsNullOrWhiteSpace(barcode))
            throw new DomainRuleViolationException("Location barcode is required.");
        if (capacity is <= 0)
            throw new DomainRuleViolationException("Capacity must be greater than zero.");

        Code = code.Trim().ToUpperInvariant();
        Name = name.Trim();
        Barcode = barcode.Trim().ToUpperInvariant();
        Capacity = capacity;
    }
}
