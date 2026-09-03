namespace Mbb.Archive.Api.Infrastructure;

internal static class DeploymentGuard
{
    internal static void EnsureFoundationIsNotExposedUnauthenticated(
        WebApplication app)
    {
        if (app.Environment.IsDevelopment())
            return;

        var authentication = app.Configuration
            .GetSection(ArchiveAuthenticationOptions.SectionName)
            .Get<ArchiveAuthenticationOptions>();

        if (authentication is null ||
            !authentication.Enabled ||
            string.IsNullOrWhiteSpace(authentication.Authority) ||
            string.IsNullOrWhiteSpace(authentication.Audience))
        {
            throw new InvalidOperationException(
                "Production requires enabled JWT/OIDC authentication with a configured authority and audience.");
        }
    }
}
