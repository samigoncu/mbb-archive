using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Organization.Domain.Units;

public readonly record struct OrganizationUnitId(Guid Value)
{
    public static OrganizationUnitId New() => new(Guid.CreateVersion7());
}

/// <summary>
/// Kurumsal birim. Hiyerarşi materyalize yol ile tutulur: bir birimin altındaki
/// her şeyi bulmak tek <c>LIKE 'yol%'</c> sorgusudur, özyinelemeli CTE veya
/// kapanış tablosu gerekmez.
/// </summary>
public sealed class OrganizationUnit : AggregateRoot<OrganizationUnitId>
{
    public const string PathSeparator = "/";

    private OrganizationUnit()
    {
    }

    private OrganizationUnit(
        OrganizationUnitId id,
        string code,
        string name,
        string? shortName,
        OrganizationUnitId? parentId,
        string path,
        int depth,
        string? externalReference,
        DateTimeOffset createdAt)
        : base(id)
    {
        Code = NormalizeCode(code);
        Name = Require(name, "Unit name", 300);
        ShortName = string.IsNullOrWhiteSpace(shortName) ? null : shortName.Trim();
        ParentId = parentId;
        Path = path;
        Depth = depth;
        ExternalReference = string.IsNullOrWhiteSpace(externalReference)
            ? null
            : externalReference.Trim();
        IsActive = true;
        CreatedAt = createdAt;
        ConcurrencyVersion = 1;
    }

    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? ShortName { get; private set; }
    public OrganizationUnitId? ParentId { get; private set; }

    /// <summary>
    /// Kökten bu birime kadar kodların yolu: <c>/GS/BID/BID-YAZ/</c>.
    /// Baştaki ve sondaki ayraç, önek eşleşmesinin yanlış birim yakalamasını
    /// engeller (<c>/GS/BI</c> ile <c>/GS/BID</c> karışmaz).
    /// </summary>
    public string Path { get; private set; } = PathSeparator;

    public int Depth { get; private set; }

    /// <summary>Dizindeki karşılığı (AD DN veya OU yolu); eşitlemede kullanılır.</summary>
    public string? ExternalReference { get; private set; }

    /// <summary>
    /// Teşkilattaki seviyesi (daire başkanlığı, şube müdürlüğü…); atanmamış olabilir.
    /// </summary>
    /// <remarks>
    /// İsteğe bağlıdır: seviye kataloğu sonradan geldiği için mevcut birimler
    /// türsüz olabilir. Zorunlu kılmak, katalog kurulmadan önce açılmış her
    /// birimi geçersiz duruma düşürürdü. Atandığında üst birimin seviyesiyle
    /// tutarlılığı doğrulanır.
    /// </remarks>
    public string? TypeCode { get; private set; }

    public bool IsActive { get; private set; }
    public bool IsRemoved { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public long ConcurrencyVersion { get; private set; }

    public static OrganizationUnit CreateRoot(
        string code,
        string name,
        string? shortName,
        string? externalReference,
        DateTimeOffset now)
    {
        var normalized = NormalizeCode(code);

        return new OrganizationUnit(
            OrganizationUnitId.New(),
            normalized,
            name,
            shortName,
            parentId: null,
            path: $"{PathSeparator}{normalized}{PathSeparator}",
            depth: 0,
            externalReference,
            now);
    }

    public OrganizationUnit CreateChild(
        string code,
        string name,
        string? shortName,
        string? externalReference,
        DateTimeOffset now)
    {
        if (!IsActive || IsRemoved) throw new DomainRuleViolationException("Pasif birimin altına yeni birim eklenemez.");
        var normalized = NormalizeCode(code);

        return new OrganizationUnit(
            OrganizationUnitId.New(),
            normalized,
            name,
            shortName,
            parentId: Id,
            path: $"{Path}{normalized}{PathSeparator}",
            depth: Depth + 1,
            externalReference,
            now);
    }

    /// <summary>
    /// Birimin teşkilat seviyesini belirler; <c>null</c> seviyeyi kaldırır.
    /// </summary>
    /// <param name="parentType">
    /// Üst birimin seviyesi. Üst birim yoksa ya da onun seviyesi atanmamışsa
    /// <c>null</c> geçilir ve kademe kuralı uygulanmaz — henüz seviyelendirilmemiş
    /// bir ağacı yukarıdan aşağı doldurmak mümkün olmalı.
    /// </param>
    public void AssignType(
        OrganizationUnitTypeDefinition? definition,
        OrganizationUnitTypeDefinition? parentType)
    {
        if (definition is null)
        {
            TypeCode = null;
            ConcurrencyVersion++;
            return;
        }

        if (!definition.IsActive)
            throw new DomainRuleViolationException("Pasif bir birim seviyesi atanamaz.");

        if (parentType is not null && !definition.CanNestUnder(parentType))
        {
            throw new DomainRuleViolationException(
                $"'{definition.Name}' seviyesi '{parentType.Name}' altına bağlanamaz; "
                + "alt birim üstünden daha derin bir seviyede olmalıdır.");
        }

        TypeCode = definition.Code;
        ConcurrencyVersion++;
    }

    public void ChangeFilePlanAssignments() => ConcurrencyVersion++;

    public void Remove()
    {
        IsRemoved = true;
        IsActive = false;
        ConcurrencyVersion++;
    }

    public void Rename(string name, string? shortName)
    {
        Name = Require(name, "Unit name", 300);
        ShortName = string.IsNullOrWhiteSpace(shortName) ? null : shortName.Trim();
        ConcurrencyVersion++;
    }

    public void LinkToDirectory(string? externalReference)
    {
        ExternalReference = string.IsNullOrWhiteSpace(externalReference)
            ? null
            : externalReference.Trim();

        ConcurrencyVersion++;
    }

    /// <summary>
    /// Birim kapatılır, silinmez: geçmiş belgelerin sahibi kalmalıdır. Kapalı
    /// birime yeni belge atanmaz ama eski belgeler erişilebilir kalır.
    /// </summary>
    public void Deactivate()
    {
        if (!IsActive)
            return;

        IsActive = false;
        ConcurrencyVersion++;
    }

    public void Activate()
    {
        if (IsActive)
            return;

        IsActive = true;
        ConcurrencyVersion++;
    }

    /// <summary>
    /// Alt ağaç taşındığında yol yeniden yazılır. Çağıran, alt birimlerin
    /// yollarını da <see cref="RewritePath"/> ile güncellemekle yükümlüdür.
    /// </summary>
    public void MoveTo(OrganizationUnit? newParent)
    {
        if (newParent is not null && newParent.Path.StartsWith(Path, StringComparison.Ordinal))
        {
            throw new DomainRuleViolationException(
                "A unit cannot be moved under its own descendant.");
        }

        ParentId = newParent?.Id;

        var basePath = newParent is null ? PathSeparator : newParent.Path;
        Path = $"{basePath}{Code}{PathSeparator}";
        Depth = newParent is null ? 0 : newParent.Depth + 1;
        ConcurrencyVersion++;
    }

    /// <summary>Üst birimin yolu değiştiğinde alt birimin yolunu tazeler.</summary>
    public void RewritePath(string oldPrefix, string newPrefix)
    {
        if (!Path.StartsWith(oldPrefix, StringComparison.Ordinal))
            return;

        Path = string.Concat(newPrefix, Path.AsSpan(oldPrefix.Length));
        Depth = Path.Count(c => c == PathSeparator[0]) - 2;
        ConcurrencyVersion++;
    }

    /// <summary>Bu birim, verilen yolun atası mı (kendisi dahil)?</summary>
    public bool IsAncestorOf(string otherPath)
        => otherPath.StartsWith(Path, StringComparison.Ordinal);

    private static string NormalizeCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainRuleViolationException("Unit code is required.");

        var trimmed = code.Trim().ToUpperInvariant();

        if (trimmed.Length > 40)
            throw new DomainRuleViolationException("Unit code cannot exceed 40 characters.");

        if (trimmed.Contains(PathSeparator, StringComparison.Ordinal))
        {
            throw new DomainRuleViolationException(
                "Unit code cannot contain the path separator.");
        }

        return trimmed;
    }

    private static string Require(string value, string field, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainRuleViolationException($"{field} is required.");

        var trimmed = value.Trim();

        if (trimmed.Length > maxLength)
            throw new DomainRuleViolationException($"{field} cannot exceed {maxLength} characters.");

        return trimmed;
    }
}

/// <summary>Kullanıcının birim üyeliği. Vekâlet için çoklu üyelik desteklenir.</summary>
public sealed class UnitMembership : AggregateRoot<Guid>
{
    private UnitMembership()
    {
    }

    private UnitMembership(
        Guid id,
        string subjectId,
        OrganizationUnitId unitId,
        bool isPrimary,
        MembershipSource source,
        DateTimeOffset createdAt)
        : base(id)
    {
        if (string.IsNullOrWhiteSpace(subjectId))
            throw new DomainRuleViolationException("Subject id is required.");

        SubjectId = subjectId.Trim();
        UnitId = unitId;
        IsPrimary = isPrimary;
        Source = source;
        CreatedAt = createdAt;
    }

    public string SubjectId { get; private set; } = string.Empty;
    public OrganizationUnitId UnitId { get; private set; }

    /// <summary>Yüklenen belgenin sahibi birim, birincil üyelikten belirlenir.</summary>
    public bool IsPrimary { get; private set; }

    public MembershipSource Source { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static UnitMembership Create(
        string subjectId,
        OrganizationUnitId unitId,
        bool isPrimary,
        MembershipSource source,
        DateTimeOffset now)
        => new(Guid.CreateVersion7(), subjectId, unitId, isPrimary, source, now);

    public void SetPrimary(bool isPrimary) => IsPrimary = isPrimary;
}

public enum MembershipSource
{
    /// <summary>Ekrandan elle verildi; dizin eşitlemesi bunu silmez.</summary>
    Manual = 0,

    /// <summary>Dizinden geldi; eşitleme sırasında yeniden hesaplanır.</summary>
    Directory = 1
}
