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
    /// <summary>
    /// Geliştirme kimliğine verilecek roller. Varsayılan bilinçli olarak
    /// boştur: buraya kodda bir değer konursa yapılandırma binder'ı diziye
    /// <em>ekleme</em> yapar ve rol yapılandırmadan kaldırılamaz hâle gelir —
    /// yani bootstrap istisnası kapatılamaz. Gerçek değer appsettings'ten gelir.
    /// </summary>
    public string[] DevelopmentRoles { get; init; } = [];
}
