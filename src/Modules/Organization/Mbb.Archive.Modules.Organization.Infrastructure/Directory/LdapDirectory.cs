using System.DirectoryServices.Protocols;
using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
using Mbb.Archive.Modules.Organization.Application.Directory;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

/// <summary>
/// LDAP/Active Directory yapılandırmasının ortam değişkeni yolu.
/// </summary>
/// <remarks>
/// Ayar artık öncelikle veritabanından, yönetim ekranı üzerinden gelir
/// (<see cref="IDirectoryRuntime"/>). Bu tip, dizin kaydı veritabanına
/// taşınmadan önce kurulmuş ortamların çalışmayı sürdürmesi için duruyor:
/// §0.11 ve §28 gereği varsayılanlar boştur ve boşken bağlayıcı devre dışı kalır.
/// </remarks>
public sealed class LdapOptions
{
    public const string SectionName = "Directory:Ldap";

    public string Host { get; init; } = string.Empty;
    public int Port { get; init; } = 636;
    public bool UseSsl { get; init; } = true;

    /// <summary>Okuma yetkili servis hesabı; yazma yetkisi verilmemelidir.</summary>
    public string BindDn { get; init; } = string.Empty;
    public string BindPassword { get; init; } = string.Empty;

    /// <summary>Kullanıcı aramasının başlayacağı taban, örn. <c>OU=Personel,DC=mbb,DC=gov,DC=tr</c>.</summary>
    public string UserSearchBase { get; init; } = string.Empty;

    /// <summary>Birim ağacının okunacağı taban.</summary>
    public string UnitSearchBase { get; init; } = string.Empty;

    /// <summary>Kullanıcıyı sicil/kullanıcı adıyla bulan süzgeç; <c>{0}</c> özne kimliğidir.</summary>
    public string UserFilter { get; init; } = "(&(objectClass=user)(sAMAccountName={0}))";

    public string UnitFilter { get; init; } = "(objectClass=organizationalUnit)";

    /// <summary>Kullanıcının biriminin okunacağı öznitelik.</summary>
    public string UnitAttribute { get; init; } = "department";

    public string GroupAttribute { get; init; } = "memberOf";

    public string DisplayNameAttribute { get; init; } = "displayName";

    public string MailAttribute { get; init; } = "mail";

    public int TimeoutSeconds { get; init; } = 20;

    public bool IsConfigured
        => !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(UserSearchBase);
}

/// <summary>Dizinden okunan kullanıcı künyesi.</summary>
public sealed record DirectoryUser(
    string SubjectId,
    string DisplayName,
    string? UnitReference,
    IReadOnlyList<string> Groups, bool IsActive = true,
    string? Email = null, string? Title = null);

public sealed record DirectoryUnit(
    string DistinguishedName,
    string Name,
    string? ParentDistinguishedName);

public interface IDirectoryClient
{
    bool IsConfigured { get; }

    Task<Result<DirectoryUser>> FindUserAsync(
        string subjectId,
        CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<DirectoryUnit>>> ListUnitsAsync(
        CancellationToken cancellationToken);
}

/// <summary>
/// LDAP okuma bağlayıcısı. Yalnızca <em>okur</em>: kullanıcı ve birim
/// bilgisini eşitler, parola doğrulaması yapmaz — kimlik doğrulama kimlik
/// sağlayıcıda (OIDC) kalır, böylece parola arşiv API'sinden hiç geçmez.
/// </summary>
internal sealed class LdapDirectoryClient : IDirectoryClient
{
    private readonly LdapOptions _fallback;
    private readonly IDirectoryRuntime _runtime;
    private readonly ILogger<LdapDirectoryClient> _logger;

    public LdapDirectoryClient(
        IOptions<LdapOptions> options,
        IDirectoryRuntime runtime,
        ILogger<LdapDirectoryClient> logger)
    {
        _fallback = options.Value;
        _runtime = runtime;
        _logger = logger;
    }

    /// <summary>
    /// Yönetim ekranından kaydedilen ayar, ortam değişkeninden gelene üstündür.
    /// </summary>
    /// <remarks>
    /// Ortam değişkeni yolu, dizin kaydı veritabanına taşınmadan önce kurulmuş
    /// ortamlar için duruyor: panelde dizin etkinleştirilmemişse eskisi çalışır.
    /// </remarks>
    private LdapOptions Options
    {
        get
        {
            var runtime = _runtime.Current;
            if (!runtime.IsConfigured) return _fallback;

            return new LdapOptions
            {
                Host = runtime.Host,
                Port = runtime.Port,
                UseSsl = runtime.UseSsl,
                BindDn = runtime.BindDn,
                BindPassword = runtime.BindPassword ?? string.Empty,
                UserSearchBase = runtime.UserSearchBase,
                UnitSearchBase = runtime.UnitSearchBase,
                UserFilter = runtime.UserFilter,
                UnitFilter = runtime.UnitFilter,
                UnitAttribute = runtime.UnitAttribute,
                GroupAttribute = runtime.GroupAttribute,
                MailAttribute = runtime.MailAttribute,
                DisplayNameAttribute = runtime.DisplayNameAttribute,
                TimeoutSeconds = runtime.TimeoutSeconds,
            };
        }
    }

    public bool IsConfigured => Options.IsConfigured;

    public Task<Result<DirectoryUser>> FindUserAsync(
        string subjectId,
        CancellationToken cancellationToken)
    {
        var options = Options;
        if (!options.IsConfigured)
            return Task.FromResult(Result<DirectoryUser>.Failure(NotConfigured));

        return Task.Run(
            () =>
            {
                try
                {
                    using var connection = Connect(options);

                    var request = new SearchRequest(
                        options.UserSearchBase,
                        string.Format(options.UserFilter, EscapeFilter(subjectId)),
                        SearchScope.Subtree,
                        "sAMAccountName",
                        options.DisplayNameAttribute,
                        "userAccountControl",
                        "title",
                        options.MailAttribute,
                        options.UnitAttribute,
                        options.GroupAttribute);

                    var response = (SearchResponse)connection.SendRequest(request);

                    if (response.Entries.Count == 0)
                    {
                        return Result<DirectoryUser>.Failure(
                            Error.NotFound(
                                "directory.user_not_found",
                                $"'{subjectId}' was not found in the directory."));
                    }

                    if (response.Entries.Count != 1)
                        return Result<DirectoryUser>.Failure(Error.Conflict("directory.ambiguous_user", "Dizin sorgusu birden fazla kullanıcı döndürdü; eşitleme durduruldu."));
                    var entry = response.Entries[0];

                    return Result<DirectoryUser>.Success(
                        new DirectoryUser(
                            First(entry, "sAMAccountName") ?? subjectId,
                            First(entry, options.DisplayNameAttribute) ?? subjectId,
                            First(entry, options.UnitAttribute),
                            All(entry, options.GroupAttribute),
                            // userAccountControl'ün 2. biti kapalı hesabı gösterir.
                            !int.TryParse(First(entry, "userAccountControl"), out var flags) || (flags & 2) == 0,
                            First(entry, options.MailAttribute),
                            First(entry, "title")));
                }
                catch (Exception exception)
                {
                    _logger.LogError(exception, "LDAP user lookup failed for {Subject}.", subjectId);
                    return Result<DirectoryUser>.Failure(Unreachable);
                }
            },
            cancellationToken);
    }

    public Task<Result<IReadOnlyList<DirectoryUnit>>> ListUnitsAsync(
        CancellationToken cancellationToken)
    {
        var options = Options;
        if (!options.IsConfigured || string.IsNullOrWhiteSpace(options.UnitSearchBase))
            return Task.FromResult(Result<IReadOnlyList<DirectoryUnit>>.Failure(NotConfigured));

        return Task.Run(
            () =>
            {
                try
                {
                    using var connection = Connect(options);

                    var request = new SearchRequest(
                        options.UnitSearchBase,
                        options.UnitFilter,
                        SearchScope.Subtree,
                        "distinguishedName",
                        "name");

                    var response = (SearchResponse)connection.SendRequest(request);
                    var units = new List<DirectoryUnit>();

                    foreach (SearchResultEntry entry in response.Entries)
                    {
                        var dn = First(entry, "distinguishedName") ?? entry.DistinguishedName;
                        units.Add(new DirectoryUnit(dn, First(entry, "name") ?? dn, ParentOf(dn)));
                    }

                    return Result<IReadOnlyList<DirectoryUnit>>.Success(units);
                }
                catch (Exception exception)
                {
                    _logger.LogError(exception, "LDAP unit listing failed.");
                    return Result<IReadOnlyList<DirectoryUnit>>.Failure(Unreachable);
                }
            },
            cancellationToken);
    }

    private static LdapConnection Connect(LdapOptions options)
    {
        var identifier = new LdapDirectoryIdentifier(options.Host, options.Port);
        var connection = new LdapConnection(identifier)
        {
            AuthType = AuthType.Basic,
            Timeout = TimeSpan.FromSeconds(Math.Clamp(options.TimeoutSeconds, 1, 120))
        };

        connection.SessionOptions.ProtocolVersion = 3;
        connection.SessionOptions.SecureSocketLayer = options.UseSsl;

        connection.Credential = new NetworkCredential(options.BindDn, options.BindPassword);
        connection.Bind();

        return connection;
    }

    /// <summary>
    /// DN'in bir üst seviyesi: <c>OU=Yazilim,OU=BID,DC=…</c> → <c>OU=BID,DC=…</c>.
    /// Kaçırılmış virgüller (<c>\,</c>) ayraç sayılmaz.
    /// </summary>
    internal static string? ParentOf(string distinguishedName)
    {
        for (var i = 0; i < distinguishedName.Length; i++)
        {
            if (distinguishedName[i] != ',')
                continue;

            if (i > 0 && distinguishedName[i - 1] == '\\')
                continue;

            var parent = distinguishedName[(i + 1)..].Trim();
            return string.IsNullOrEmpty(parent) ? null : parent;
        }

        return null;
    }

    /// <summary>RFC 4515 kaçışı; süzgeç enjeksiyonunu engeller.</summary>
    internal static string EscapeFilter(string value)
        => value
            .Replace("\\", "\\5c", StringComparison.Ordinal)
            .Replace("*", "\\2a", StringComparison.Ordinal)
            .Replace("(", "\\28", StringComparison.Ordinal)
            .Replace(")", "\\29", StringComparison.Ordinal)
            .Replace("\0", "\\00", StringComparison.Ordinal);

    private static string? First(SearchResultEntry entry, string attribute)
        => entry.Attributes.Contains(attribute) && entry.Attributes[attribute].Count > 0
            ? entry.Attributes[attribute][0]?.ToString()
            : null;

    private static IReadOnlyList<string> All(SearchResultEntry entry, string attribute)
    {
        if (!entry.Attributes.Contains(attribute))
            return [];

        var values = new List<string>();

        foreach (var value in entry.Attributes[attribute])
        {
            var text = value switch
            {
                string s => s,
                byte[] bytes => System.Text.Encoding.UTF8.GetString(bytes),
                _ => value?.ToString()
            };

            if (!string.IsNullOrWhiteSpace(text))
                values.Add(text);
        }

        return values;
    }

    private static Error NotConfigured => Error.Failure(
        "directory.not_configured",
        "An LDAP directory is not configured. Set Directory:Ldap:Host through the environment.");

    private static Error Unreachable => Error.Failure(
        "directory.unreachable",
        "The LDAP directory is unreachable.");
}
