using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.AccessControl.Application.Abstractions;

namespace Mbb.Archive.Api.Infrastructure;

internal sealed record PermissionRequirement(string Permission)
    : IAuthorizationRequirement;

internal sealed class PermissionAuthorizationHandler
    : AuthorizationHandler<PermissionRequirement>
{
    private readonly IPermissionChecker _permissions;
    private readonly IHostEnvironment _environment;
    private readonly IOptions<ArchiveAuthenticationOptions> _options;

    public PermissionAuthorizationHandler(
        IPermissionChecker permissions,
        IHostEnvironment environment,
        IOptions<ArchiveAuthenticationOptions> options)
    {
        _permissions = permissions;
        _environment = environment;
        _options = options;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var subject =
            context.User.FindFirst("sub")?.Value ??
            context.User.Identity?.Name;

        if (string.IsNullOrWhiteSpace(subject))
            return;

        var roles = context.User
            .FindAll(System.Security.Claims.ClaimTypes.Role)
            .Select(x => x.Value)
            .Concat(context.User.FindAll("role").Select(x => x.Value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        // Local development still passes through authorization, but the
        // explicit Administrators role can bootstrap the empty access database.
        if (_environment.IsDevelopment() &&
            !_options.Value.Enabled &&
            roles.Contains("Administrators", StringComparer.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
            return;
        }

        if (await _permissions.HasPermissionAsync(
                subject,
                roles,
                requirement.Permission,
                CancellationToken.None))
        {
            context.Succeed(requirement);
        }
    }
}

internal sealed class PermissionPolicyProvider
    : DefaultAuthorizationPolicyProvider
{
    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
        : base(options)
    {
    }

    public override Task<AuthorizationPolicy?> GetPolicyAsync(
        string policyName)
    {
        const string prefix = "permission:";

        if (policyName.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            var permission = policyName[prefix.Length..];

            var policy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(permission))
                .Build();

            return Task.FromResult<AuthorizationPolicy?>(policy);
        }

        return base.GetPolicyAsync(policyName);
    }
}
