namespace Mbb.Archive.Modules.Organization.Application.Abstractions;

public sealed record OrganizationUnitSummary(
    Guid Id,
    string Code,
    string Name,
    string? ShortName,
    Guid? ParentId,
    string Path,
    int Depth,
    bool IsActive,
    string? ExternalReference,
    int MemberCount,
    /// <summary>Teşkilat seviyesi kodu; atanmamışsa null.</summary>
    string? TypeCode = null,
    /// <summary>Seviyenin görünen adı; katalogdan çözülür.</summary>
    string? TypeName = null);

public sealed record UnitMembershipSummary(
    Guid Id,
    string SubjectId,
    Guid UnitId,
    string UnitCode,
    string UnitName,
    bool IsPrimary,
    string Source,
    DateTimeOffset CreatedAt);

/// <summary>
/// Bir öznenin yetkilendirmede kullanılacak birim kapsamı. Yollar, alt
/// birimlerin de kapsama girmesini sağlar (önek eşleşmesi).
/// </summary>
public sealed record SubjectUnitScope(
    string SubjectId,
    Guid? PrimaryUnitId,
    IReadOnlyList<Guid> UnitIds,
    IReadOnlyList<string> UnitPaths);
