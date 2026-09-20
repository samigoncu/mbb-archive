using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Organization.Domain.Units;

/// <summary>
/// Birim seviyesi tanımı: daire başkanlığı, şube müdürlüğü, servis gibi.
/// </summary>
/// <remarks>
/// <para>
/// Kurumun teşkilat kalıbı önceden yalnız birim <em>adlarının içinde</em>
/// yaşıyordu: "Bilgi İşlem Dairesi Başkanlığı" adından bunun bir daire
/// başkanlığı olduğu okunabiliyordu ama sistem bunu bilmiyordu. Bu yüzden
/// kalıp ne zorlanabiliyor, ne raporlanabiliyor, ne de kurumdan kuruma
/// değiştirilebiliyordu.
/// </para>
/// <para>
/// Artık tanım verisidir. Teşkilat şeması değişen bir kurum seviye ekler,
/// yeniden adlandırır ya da sıralamasını değiştirir; kod değişmez.
/// </para>
/// <para>
/// İç içe geçme kuralı seviyeye dayanır: bir birim yalnız kendisinden daha
/// küçük seviyeli bir birimin altına açılabilir. Zincir katı değildir —
/// daire başkanlığının altına doğrudan servis bağlanabilir, araya şube
/// müdürlüğü koymak zorunlu değildir.
/// </para>
/// </remarks>
public sealed class OrganizationUnitTypeDefinition : AggregateRoot<Guid>
{
    private OrganizationUnitTypeDefinition() { }

    private OrganizationUnitTypeDefinition(Guid id, string code, bool isBuiltIn) : base(id)
    {
        Code = Normalize(code);
        IsBuiltIn = isBuiltIn;
    }

    /// <summary>Birim kayıtlarının taşıdığı değişmez anahtar.</summary>
    public string Code { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    /// <summary>Teşkilattaki derinlik. Küçük olan üsttedir.</summary>
    public int Level { get; private set; }

    /// <summary>
    /// Bu seviyedeki birime doğrudan personel bağlanabilir mi.
    /// </summary>
    /// <remarks>
    /// "Genel Sekreterlik" gibi ara seviyeler çoğu kurumda yalnız hiyerarşi
    /// taşır; evrak ve personel alt birimlere düşer. Bu ayrım, yetki kapsamı
    /// verilirken yanlış seviyenin seçilmesini önler.
    /// </remarks>
    public bool CanHoldMembers { get; private set; } = true;

    public bool IsActive { get; private set; } = true;

    /// <summary>Kurulumla gelen seviye; yeniden adlandırılır ama silinmez.</summary>
    public bool IsBuiltIn { get; private set; }

    public static OrganizationUnitTypeDefinition Create(
        string code, string name, int level, bool canHoldMembers, bool isBuiltIn = false)
    {
        var definition = new OrganizationUnitTypeDefinition(Guid.CreateVersion7(), code, isBuiltIn);
        definition.Update(name, level, canHoldMembers);
        return definition;
    }

    public void Update(string name, int level, bool canHoldMembers)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainRuleViolationException("Seviye adı zorunludur.");
        if (name.Trim().Length > 100)
            throw new DomainRuleViolationException("Seviye adı en fazla 100 karakter olabilir.");
        if (level is < 1 or > 50)
            throw new DomainRuleViolationException("Seviye 1–50 arasında olmalıdır.");

        Name = name.Trim();
        Level = level;
        CanHoldMembers = canHoldMembers;
    }

    public void SetActive(bool isActive)
    {
        if (!isActive && IsBuiltIn && Level == 1)
            throw new DomainRuleViolationException("Kurum seviyesi pasife alınamaz.");
        IsActive = isActive;
    }

    /// <summary>Alt seviye, üstünden kesin olarak daha derin olmalıdır.</summary>
    public bool CanNestUnder(OrganizationUnitTypeDefinition parent) => Level > parent.Level;

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
    /// Kurulumla gelen seviyeler: 5018 sayılı kanun ve belediye teşkilat
    /// yönetmeliklerindeki yaygın kademelenme. Kurum kendi yapısına göre
    /// ekler, siler ya da yeniden adlandırır.
    /// </summary>
    public static IReadOnlyList<(string Code, string Name, int Level, bool CanHoldMembers)> BuiltIns =>
    [
        ("Institution", "Kurum", 1, false),
        ("ExecutiveOffice", "Başkanlık Makamı", 2, true),
        ("GeneralSecretariat", "Genel Sekreterlik", 2, true),
        ("Directorate", "Daire Başkanlığı", 3, true),
        ("Advisory", "Müşavirlik", 3, true),
        ("Branch", "Şube Müdürlüğü", 4, true),
        ("Service", "Servis", 5, true),
        ("Office", "Büro", 6, true),
    ];
}
