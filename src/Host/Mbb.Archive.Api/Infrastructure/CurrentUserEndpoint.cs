using System.Security.Claims;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.AccessControl.Application.Abstractions;

namespace Mbb.Archive.Api.Infrastructure;

/// <summary>
/// Arayüzün menü ve aksiyon görünürlüğünü sunucu tarafındaki gerçek yetkiye
/// bağlaması için mevcut kimliği döner. Yetki kararının kendisi değildir;
/// backend policy'leri her istekte yeniden değerlendirir.
/// </summary>
internal static class CurrentUserEndpoint
{
    internal static IEndpointRouteBuilder MapCurrentUser(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(
                "/api/v1/access/me",
                async (
                    ClaimsPrincipal user,
                    IAccessRepository access,
                    IHostEnvironment environment,
                    IOptions<ArchiveAuthenticationOptions> options,
                    CancellationToken cancellationToken) =>
                {
                    var subject =
                        user.FindFirst("sub")?.Value ?? user.Identity?.Name ?? "anonymous";

                    var roles = user
                        .FindAll(ClaimTypes.Role)
                        .Select(x => x.Value)
                        .Concat(user.FindAll("role").Select(x => x.Value))
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToArray();

                    var permissions = await access.GetPermissionsAsync(
                        subject,
                        roles,
                        cancellationToken);

                    // Development bootstrap: erişim veritabanı boşken
                    // Administrators rolü tüm izinleri karşılar.
                    var isBootstrapAdministrator =
                        environment.IsDevelopment()
                        && !options.Value.Enabled
                        && roles.Contains("Administrators", StringComparer.OrdinalIgnoreCase);

                    return Results.Ok(new
                    {
                        subject,
                        roles,
                        permissions,
                        isAuthenticated = user.Identity?.IsAuthenticated ?? false,
                        authenticationMode = options.Value.Enabled ? "Jwt" : "Development",
                        isBootstrapAdministrator,
                    });
                })
            .WithTags("Access")
            .WithName("GetCurrentUser")
            .RequireAuthorization();

        return endpoints;
    }
}
