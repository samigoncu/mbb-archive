using System.Security.Claims;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.AccessControl.Application.Abstractions;

namespace Mbb.Archive.Api.Infrastructure;

/// <summary>
/// <see cref="ICurrentUserPermissions"/> uygulamasını Host üstlenir; böylece
/// modüller AccessControl'e referans vermeden etkin izinleri okuyabilir.
/// </summary>
internal sealed class HttpCurrentUserPermissions : ICurrentUserPermissions
{
    private readonly IHttpContextAccessor _accessor;
    private readonly IAccessRepository _access;
    private readonly IHostEnvironment _environment;
    private readonly IOptions<ArchiveAuthenticationOptions> _options;

    public HttpCurrentUserPermissions(
        IHttpContextAccessor accessor,
        IAccessRepository access,
        IHostEnvironment environment,
        IOptions<ArchiveAuthenticationOptions> options)
    {
        _accessor = accessor;
        _access = access;
        _environment = environment;
        _options = options;
    }

    public string Subject
        => User?.FindFirst("sub")?.Value
            ?? User?.Identity?.Name
            ?? "anonymous";

    public IReadOnlyCollection<string> Groups => Roles;

    public Task<bool> HasAllPermissionsAsync(CancellationToken cancellationToken)
        => Task.FromResult(
            _environment.IsDevelopment()
            && !_options.Value.Enabled
            && Roles.Contains("Administrators", StringComparer.OrdinalIgnoreCase));

    public async Task<IReadOnlyCollection<string>> GetAsync(
        CancellationToken cancellationToken)
        => await _access.GetPermissionsAsync(Subject, Roles, cancellationToken);

    private ClaimsPrincipal? User => _accessor.HttpContext?.User;

    private string[] Roles
        => User is null
            ? []
            : User
                .FindAll(ClaimTypes.Role)
                .Select(x => x.Value)
                .Concat(User.FindAll("role").Select(x => x.Value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
}
