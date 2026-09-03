using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Mbb.Archive.Api.Infrastructure;

/// <summary>
/// Development-only authentication scheme. It exists so local development
/// exercises the authorization pipeline instead of bypassing it completely.
/// </summary>
internal sealed class DevelopmentAuthenticationHandler
    : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IOptions<ArchiveAuthenticationOptions> _archiveOptions;

    public DevelopmentAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IOptions<ArchiveAuthenticationOptions> archiveOptions)
        : base(options, logger, encoder)
    {
        _archiveOptions = archiveOptions;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var options = _archiveOptions.Value;

        var claims = new List<Claim>
        {
            new("sub", options.DevelopmentSubject),
            new(ClaimTypes.Name, options.DevelopmentSubject)
        };

        claims.AddRange(
            options.DevelopmentRoles.Select(
                role => new Claim(ClaimTypes.Role, role)));

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
