using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;

/// <summary>
/// Yerleşim seviyesi tanımı: bina, oda, dolap, raf gibi.
/// </summary>
/// <remarks>
/// <para>
/// Önceden sabit bir enum ve sabit bir üst-alt eşlemesiydi; kurum kendi
/// yerleşimine seviye ekleyemiyordu. Artık tanım verisidir: seviye eklenebilir,
/// yeniden adlandırılabilir, sıralaması değiştirilebilir.
/// </para>
/// <para>
/// İç içe geçme kuralı seviyeye dayanır: bir konum, yalnız kendisinden daha
/// küçük seviyeli bir konumun altına açılabilir. Böylece "Koridor"u atlayıp
/// dolabı doğrudan odaya bağlamak da mümkündür; zincir katı değildir.
/// </para>
/// </remarks>
public sealed class ArchiveLocationTypeDefinition : AggregateRoot<Guid>
{
    private ArchiveLocationTypeDefinition() { }

    private ArchiveLocationTypeDefinition(Guid id, string code, bool isBuiltIn) : base(id)
    {
        Code = Normalize(code);
        IsBuiltIn = isBuiltIn;
    }

    /// <summary>Konum kayıtlarının taşıdığı değişmez anahtar.</summary>
    public string Code { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    /// <summary>Hiyerarşideki derinlik. Küçük olan üsttedir.</summary>
    public int Level { get; private set; }

    /// <summary>Bu seviyeye doğrudan fiziksel klasör konulabilir mi.</summary>
    public bool CanStoreFolder { get; private set; }

    /// <summary>Kapasite (klasör adedi) tanımlanabilir mi.</summary>
    public bool AllowsCapacity { get; private set; }

    public bool IsActive { get; private set; } = true;

    /// <summary>Kurulumla gelen sekiz seviye; yeniden adlandırılır ama silinmez.</summary>
    public bool IsBuiltIn { get; private set; }

    public static ArchiveLocationTypeDefinition Create(
        string code, string name, int level, bool canStoreFolder, bool allowsCapacity, bool isBuiltIn = false)
    {
        var definition = new ArchiveLocationTypeDefinition(Guid.CreateVersion7(), code, isBuiltIn);
        definition.Update(name, level, canStoreFolder, allowsCapacity);
        return definition;
    }

    public void Update(string name, int level, bool canStoreFolder, bool allowsCapacity)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainRuleViolationException("Seviye adı zorunludur.");
        if (name.Trim().Length > 100)
            throw new DomainRuleViolationException("Seviye adı en fazla 100 karakter olabilir.");
        if (level is < 1 or > 50)
            throw new DomainRuleViolationException("Seviye 1–50 arasında olmalıdır.");
        if (allowsCapacity && !canStoreFolder)
            throw new DomainRuleViolationException("Kapasite yalnız klasör taşıyabilen seviyelerde tanımlanır.");

        Name = name.Trim();
        Level = level;
        CanStoreFolder = canStoreFolder;
        AllowsCapacity = allowsCapacity;
    }

    public void SetActive(bool isActive)
    {
        if (!isActive && IsBuiltIn && Level == 1)
            throw new DomainRuleViolationException("Kök seviye pasife alınamaz.");
        IsActive = isActive;
    }

    /// <summary>Alt seviye, üstünden kesin olarak daha derin olmalıdır.</summary>
    public bool CanNestUnder(ArchiveLocationTypeDefinition parent) => Level > parent.Level;

    private static string Normalize(string code)
    {
        var value = code?.Trim() ?? "";
        if (value.Length == 0)
            throw new DomainRuleViolationException("Seviye kodu zorunludur.");
        if (value.Length > 60)
            throw new DomainRuleViolationException("Seviye kodu en fazla 60 karakter olabilir.");
        return value;
    }

    /// <summary>
    /// Kurulumla gelen seviyeler. Kodlar eski enum adlarıyla aynıdır; mevcut
    /// konum kayıtları bu kodu taşıdığı için veri dönüştürmeye gerek kalmaz.
    /// </summary>
    public static IReadOnlyList<(string Code, string Name, int Level, bool CanStoreFolder, bool AllowsCapacity)> BuiltIns =>
    [
        ("InstitutionArchive", "Kurum Arşivi", 1, false, false),
        ("Building", "Bina", 2, false, false),
        ("ArchiveArea", "Arşiv Alanı", 3, false, false),
        ("Room", "Arşiv Odası", 4, false, false),
        ("Aisle", "Koridor", 5, false, false),
        ("Cabinet", "Dolap", 6, false, false),
        ("Shelf", "Raf", 7, true, true),
        ("Box", "Kutu", 8, true, true),
    ];
}
