namespace Mbb.Archive.Api.Infrastructure;

internal sealed class ArchiveAuthenticationOptions
{
    public const string SectionName = "Security:Authentication";

    public bool Enabled { get; init; }
    public string Authority { get; init; } = string.Empty;
    public string Audience { get; init; } = string.Empty;
    public bool RequireHttpsMetadata { get; init; } = true;

    // Development identity is intentionally explicit and is never used when
    // production JWT/OIDC authentication is enabled.
    public string DevelopmentSubject { get; init; } = "dev-admin";
    public string[] DevelopmentRoles { get; init; } = ["Administrators"];
}
