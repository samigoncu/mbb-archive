using System.DirectoryServices.Protocols;
using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Organization.Application.Directory;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

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

    public static Task<Result<string>> TestConnectionAsync(
        string host,
        int port,
        bool useSsl,
        string bindDn,
        string password,
        int timeoutSeconds,
        CancellationToken cancellationToken)
    {
        return Task.Run(() =>
        {
            try
            {
                var options = new LdapOptions
                {
                    Host = host,
                    Port = port,
                    UseSsl = useSsl,
                    BindDn = bindDn,
                    BindPassword = password,
                    TimeoutSeconds = Math.Clamp(timeoutSeconds, 1, 30)
                };

                using var connection = Connect(options);
                return Result<string>.Success("LDAP sunucusuna başarıyla bağlanıldı ve kimlik doğrulandı.");
            }
            catch (Exception ex)
            {
                return Result<string>.Failure(Error.Failure(
                    "directory.test_failed",
                    $"LDAP bağlantısı başarısız oldu: {ex.Message}"));
            }
        }, cancellationToken);
    }
}
