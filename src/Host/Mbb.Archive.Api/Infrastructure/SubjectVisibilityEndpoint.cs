using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.AccessControl.Application.Abstractions;
using Mbb.Archive.Modules.AccessControl.Application.Grants;
using Mbb.Archive.Modules.Organization.Application.Units;

namespace Mbb.Archive.Api.Infrastructure;

/// <summary>
/// "Bu kullanıcı neyi görüyor?" raporu. Yetkilendirme kurulduktan sonra en sık
/// sorulan soru budur ve cevabı üç ayrı tabloya dağılmıştır: birim üyeliği,
/// rol izinleri ve belge paylaşımları. Rapor üçünü tek ekranda toplar.
///
/// <para>
/// Rapor bir <em>karar</em> noktası değildir; yalnız yöneticiye kapsamı
/// gösterir. Gerçek yetki her istekte yeniden hesaplanır (§21).
/// </para>
/// </summary>
internal static class SubjectVisibilityEndpoint
{
    /// <summary>Kapsam üstü okuma izni; taşıyan özne süzgeçten muaftır.</summary>
    private const string ReadAllPermission = "documents.read.all";

    internal static IEndpointRouteBuilder MapSubjectVisibility(
        this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(
                "/api/v1/access/visibility/{subjectId}",
                async (
                    string subjectId,
                    IAccessRepository access,
                    OrganizationQueryHandlers organization,
                    IAccessGrantQueries grants,
                    IHostEnvironment environment,
                    IOptions<ArchiveAuthenticationOptions> options,
                    CancellationToken cancellationToken) =>
                {
                    subjectId = subjectId.Trim();

                    if (string.IsNullOrEmpty(subjectId))
                        return Results.BadRequest(new { detail = "Kullanıcı kimliği gerekli." });

                    // Dizin grupları yalnız oturumdaki jetonda bulunur; başka
                    // bir kullanıcı için burada çözülemez. Grup üzerinden gelen
                    // paylaşımlar bu yüzden rapora girmez ve bu açıkça bildirilir.
                    var permissions = await access.GetPermissionsAsync(
                        subjectId,
                        [],
                        cancellationToken);

                    var memberships = await organization.Handle(
                        new GetSubjectMembershipsQuery(subjectId),
                        cancellationToken);

                    var tree = await organization.Handle(
                        new GetUnitTreeQuery(IncludeInactive: true),
                        cancellationToken);

                    var units = memberships.IsSuccess && tree.IsSuccess
                        ? memberships.Value
                            .Join(
                                tree.Value,
                                membership => membership.UnitId,
                                unit => unit.Id,
                                (membership, unit) => new
                                {
                                    unit.Id,
                                    unit.Code,
                                    unit.Name,
                                    unit.Path,
                                    unit.IsActive,
                                    membership.IsPrimary,
                                })
                            .OrderBy(x => x.Path, StringComparer.Ordinal)
                            .ToArray()
                        : [];

                    var unitIds = units.Select(x => x.Id).ToArray();

                    var subjectGrants = await grants.GetForSubjectAsync(
                        new GrantSubjectIdentity(subjectId, [], unitIds),
                        cancellationToken);

                    var unrestricted = permissions.Contains(
                        ReadAllPermission,
                        StringComparer.OrdinalIgnoreCase);

                    // Kaldırılmış paylaşım listede kalır (denetim izi), ama
                    // görünürlük hesabına girmez: yalnız kapalı paylaşımı olan
                    // ve birimi olmayan kullanıcı hiçbir belge görmez.
                    var activeGrants = subjectGrants.Count(x => x.IsActive);

                    return Results.Ok(new
                    {
                        subjectId,
                        unrestricted,
                        permissions,
                        units,
                        // Yol önekleri kapsamın kendisidir: alt birimler de kapsanır.
                        unitPaths = units.Select(x => x.Path).ToArray(),
                        grants = subjectGrants,
                        // Hiçbir birime üye olmayan ve paylaşım almayan özne
                        // hiçbir belge görmez; ekran bunu açıkça söylemeli.
                        activeGrants,
                        seesNothing = !unrestricted
                            && units.Length == 0
                            && activeGrants == 0,
                        groupGrantsResolved = false,
                        // Geliştirme kimliği tüm izinleri karşılar ve bu rol
                        // veritabanında durmaz. Bunu söylemezsek rapor, aslında
                        // her şeyi gören bir hesap için "hiçbir şey görmüyor"
                        // diyebilir — güvenlik ekranında en kötü yanılgı budur.
                        developmentBootstrapActive =
                            environment.IsDevelopment() && !options.Value.Enabled,
                    });
                })
            .WithTags("Access")
            .WithName("GetSubjectVisibility")
            .RequireAuthorization("permission:access.grants.read");

        return endpoints;
    }
}
