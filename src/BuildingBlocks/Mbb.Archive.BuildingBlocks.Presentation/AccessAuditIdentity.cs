using System.Security.Claims;

namespace Mbb.Archive.BuildingBlocks.Presentation;

public static class AccessAuditIdentity
{
    public static string Subject(ClaimsPrincipal user)
        => user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.Identity?.Name ?? "anonymous";

    public static string? DisplayName(ClaimsPrincipal user)
    {
        var fullName = string.Join(" ", new[] {
            user.FindFirst("given_name")?.Value ?? user.FindFirst(ClaimTypes.GivenName)?.Value,
            user.FindFirst("family_name")?.Value ?? user.FindFirst(ClaimTypes.Surname)?.Value
        }.Where(value => !string.IsNullOrWhiteSpace(value)));
        var name = user.FindFirst("name")?.Value
            ?? (fullName.Length > 0 ? fullName : null)
            ?? user.FindFirst("preferred_username")?.Value ?? user.Identity?.Name;
        return string.IsNullOrWhiteSpace(name) || name == Subject(user) ? null : name;
    }
}
