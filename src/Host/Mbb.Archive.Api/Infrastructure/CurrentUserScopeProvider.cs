using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.AccessControl.Application.Grants;
using Mbb.Archive.Modules.Organization.Application.Units;

namespace Mbb.Archive.Api.Infrastructure;

/// <summary>
/// Erişim kapsamını üreten tek yer. Organization (birim üyelikleri) ve
/// AccessControl (izinler) modüllerini burada birleştiriyoruz; böylece
/// Documents ve Search bu modüllere hiç bağlanmıyor (§24 modül sınırları).
/// <para>
/// Sonuç istek başına önbelleklenir: bir istekte liste, sayım ve tekil
/// kontroller aynı kapsamı kullanır ve birim ağacı tekrar tekrar okunmaz.
/// </para>
/// </summary>
internal sealed class CurrentUserScopeProvider : ICurrentUserScope
{
    /// <summary>Kapsam üstü izin; taşıyan özne için okuma süzgeci uygulanmaz.</summary>
    private const string ReadAllPermission = "documents.read.all";

    private readonly ICurrentUserPermissions _permissions;
    private readonly OrganizationQueryHandlers _organization;
    private readonly IAccessGrantQueries _grants;
    private readonly TimeProvider _timeProvider;

    private AccessScope? _cached;

    public CurrentUserScopeProvider(
        ICurrentUserPermissions permissions,
        OrganizationQueryHandlers organization,
        IAccessGrantQueries grants,
        TimeProvider timeProvider)
    {
        _permissions = permissions;
        _organization = organization;
        _grants = grants;
        _timeProvider = timeProvider;
    }

    public async Task<AccessScope> GetAsync(CancellationToken cancellationToken)
    {
        if (_cached is not null)
            return _cached;

        var subject = _permissions.Subject;

        // Sınırsız okuma yetkisi sahiplikle karıştırılmamalıdır: her şeyi
        // görebilen bir yönetici de belge yüklediğinde o belge kendi biriminin
        // olmalıdır. Bu yüzden üyelik, kapsam üstü izinden bağımsız okunur.
        var unrestricted =
            await _permissions.HasAllPermissionsAsync(cancellationToken)
            || (await _permissions.GetAsync(cancellationToken))
                .Contains(ReadAllPermission, StringComparer.OrdinalIgnoreCase);

        var memberships = await _organization.Handle(
            new GetSubjectMembershipsQuery(subject),
            cancellationToken);

        if (memberships.IsFailure)
        {
            // Birim bilgisi okunamıyorsa kapsam boş kalır; hata durumunda
            // "hepsini göster"e düşmek sessiz bir yetki açığı olurdu.
            return _cached = unrestricted
                ? new AccessScope(subject, true, [], [], [], [])
                : AccessScope.Empty(subject);
        }

        var units = memberships.Value;
        var paths = await ResolvePathsAsync(units.Select(x => x.UnitId), cancellationToken);
        var primary = units.FirstOrDefault(x => x.IsPrimary);
        var unitIds = units.Select(x => x.UnitId).Distinct().ToArray();

        // Paylaşımlar birim sınırını aşan istisnadır: özne kendi sicili, dizin
        // grupları veya birimlerinden biriyle eşleşen her aktif yetkiyi alır.
        var grants = await _grants.ResolveAsync(
            new GrantSubjectIdentity(subject, _permissions.Groups, unitIds),
            _timeProvider.GetUtcNow(),
            cancellationToken);

        return _cached = new AccessScope(
            subject,
            unrestricted,
            UnitPaths: paths.Select(x => x.Path).ToArray(),
            UnitIds: unitIds,
            GrantedDocumentIds: grants.DocumentIds,
            GrantedFilePlanCodes: grants.FilePlanCodes,
            PrimaryUnitId: primary?.UnitId,
            PrimaryUnitPath: primary is null
                ? null
                : paths.FirstOrDefault(x => x.Id == primary.UnitId).Path);
    }

    /// <summary>
    /// Üyelik birimlerinin materyalize yollarını çözer. Yol öneki, alt
    /// birimleri de kapsar: daire başkanı şubelerini görür.
    /// </summary>
    private async Task<IReadOnlyList<(Guid Id, string Path)>> ResolvePathsAsync(
        IEnumerable<Guid> unitIds,
        CancellationToken cancellationToken)
    {
        var wanted = unitIds.ToHashSet();

        if (wanted.Count == 0)
            return [];

        var tree = await _organization.Handle(
            new GetUnitTreeQuery(IncludeInactive: true),
            cancellationToken);

        if (tree.IsFailure)
            return [];

        return tree.Value
            .Where(unit => wanted.Contains(unit.Id))
            .Select(unit => (unit.Id, unit.Path))
            .ToArray();
    }
}
