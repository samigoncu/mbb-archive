using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Organization.Application;
using Mbb.Archive.Modules.Organization.Application.Directory;
using Mbb.Archive.Modules.Organization.Domain.Directory;
using Mbb.Archive.Modules.Organization.Infrastructure.Directory;

namespace Mbb.Archive.Modules.Organization.UnitTests;

[TestClass]
public sealed class MalatyaApiClientTests
{
    private sealed class MockHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(handler(request));
    }

    [TestMethod]
    public async Task LoginAsync_ParsesTokenAndExpiresCorrectly()
    {
        HttpRequestMessage? captured = null;
        var handler = new MockHttpMessageHandler(req =>
        {
            captured = req;
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(new
                {
                    token = "mock-token-xyz-123",
                    expires = "2026-10-01T15:00:00Z"
                }))
            };
            return response;
        });

        var http = new HttpClient(handler);
        var services = new ServiceCollection().BuildServiceProvider();
        var scopeFactory = services.GetRequiredService<IServiceScopeFactory>();

        var client = new MalatyaApiClient(http, scopeFactory, NullLogger<MalatyaApiClient>.Instance);

        var result = await client.LoginAsync("https://api.malatya.bel.tr", "admin_user", "secret123", default);

        Assert.IsTrue(result.Succeeded);
        Assert.AreEqual("mock-token-xyz-123", result.Token);
        Assert.IsNotNull(captured);
        Assert.AreEqual("https://api.malatya.bel.tr/api/v1/Auth/login", captured.RequestUri?.ToString());
        Assert.AreEqual(HttpMethod.Post, captured.Method);
    }

    [TestMethod]
    public async Task SwitchDirectorySource_ToMalatyaApi_ValidatesTokenAndTogglesCorrectly()
    {
        var malatyaSettings = new MalatyaApiSettings();
        malatyaSettings.ChangeCredentials("https://api.malatya.bel.tr", "mbb_user", "enc_pwd", "MBB", "test", DateTimeOffset.UtcNow);

        var ldapSettings = new DirectorySettings();
        ldapSettings.Change("ldap.mbb.bel.tr", 636, true, "cn=admin", "pwd", "ou=users", "ou=units", "(&(objectClass=user)(sAMAccountName={0}))",
            "(objectClass=organizationalUnit)", "department", "memberOf", "displayName", "mail", 20, true, true, "test", DateTimeOffset.UtcNow);

        var malatyaStore = new FakeMalatyaStore(malatyaSettings);
        var ldapStore = new FakeLdapStore(ldapSettings);
        var protector = new FakeProtector();
        var client = new FakeMalatyaApiClient { TokenSuccess = true };
        var uow = new FakeUnitOfWork();
        var permissions = new FakeUserPermissions("operator");
        var time = TimeProvider.System;

        var handler = new MalatyaApiSettingsHandlers(malatyaStore, ldapStore, protector, client, uow, permissions, time);

        // Act: switch to MalatyaApi
        var result = await handler.SwitchDirectorySourceAsync(new SwitchDirectorySourceRequest("MalatyaApi"), default);

        Assert.IsTrue(result.IsSuccess);
        Assert.IsTrue(malatyaSettings.IsDirectorySyncEnabled);
        Assert.IsFalse(ldapSettings.IsEnabled);

        // Act: switch to Ldap
        var result2 = await handler.SwitchDirectorySourceAsync(new SwitchDirectorySourceRequest("Ldap"), default);

        Assert.IsTrue(result2.IsSuccess);
        Assert.IsFalse(malatyaSettings.IsDirectorySyncEnabled);
        Assert.IsTrue(ldapSettings.IsEnabled);
    }

    [TestMethod]
    public async Task SwitchDirectorySource_ToMalatyaApi_FailsWhenTokenInvalid()
    {
        var malatyaSettings = new MalatyaApiSettings();
        var ldapSettings = new DirectorySettings();
        var malatyaStore = new FakeMalatyaStore(malatyaSettings);
        var ldapStore = new FakeLdapStore(ldapSettings);
        var protector = new FakeProtector();
        var client = new FakeMalatyaApiClient { TokenSuccess = false, Error = "Geçersiz kullanıcı adı veya şifre" };
        var uow = new FakeUnitOfWork();
        var permissions = new FakeUserPermissions("operator");

        var handler = new MalatyaApiSettingsHandlers(malatyaStore, ldapStore, protector, client, uow, permissions, TimeProvider.System);

        var result = await handler.SwitchDirectorySourceAsync(new SwitchDirectorySourceRequest("MalatyaApi"), default);

        Assert.IsTrue(result.IsFailure);
        Assert.IsFalse(malatyaSettings.IsDirectorySyncEnabled);
    }

    private sealed class FakeMalatyaStore(MalatyaApiSettings settings) : IMalatyaApiSettingsStore
    {
        public Task<MalatyaApiSettings> GetAsync(CancellationToken ct) => Task.FromResult(settings);
    }

    private sealed class FakeLdapStore(DirectorySettings settings) : IDirectorySettingsStore
    {
        public Task<DirectorySettings> GetAsync(CancellationToken ct) => Task.FromResult(settings);
    }

    private sealed class FakeProtector : IDirectorySecretProtector
    {
        public string Protect(string plainText) => $"enc_{plainText}";
        public ProtectedSecret Unprotect(string? cipherText) => new(cipherText?.Replace("enc_", ""), false);
    }

    private sealed class FakeMalatyaApiClient : IMalatyaApiClient
    {
        public bool TokenSuccess { get; set; } = true;
        public string? Error { get; set; }

        public Task<MalatyaAuthTokenResult> LoginAsync(string baseUrl, string userName, string password, CancellationToken ct)
            => Task.FromResult(TokenSuccess
                ? new MalatyaAuthTokenResult(true, "token123", "2026-10-01T00:00:00Z", null)
                : new MalatyaAuthTokenResult(false, null, null, Error ?? "Error"));

        public Task<MalatyaAuthTokenResult> GetValidTokenAsync(CancellationToken ct)
            => LoginAsync("", "", "", ct);

        public Task<MalatyaSmsResult> SendOtpSmsAsync(string message, IReadOnlyList<string> to, string? provider, CancellationToken ct)
            => Task.FromResult(new MalatyaSmsResult(true, "ref123", null));

        public Task<MalatyaSmsResult> SendSmsAsync(string message, IReadOnlyList<string> to, string? provider, CancellationToken ct)
            => Task.FromResult(new MalatyaSmsResult(true, "ref123", null));
    }

    private sealed class FakeUnitOfWork : IUnitOfWork<OrganizationBoundary>
    {
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => Task.FromResult(1);
    }

    private sealed class FakeUserPermissions(string subject) : ICurrentUserPermissions
    {
        public string Subject => subject;
        public IReadOnlyCollection<string> Groups => [];
        public Task<bool> HasAllPermissionsAsync(CancellationToken cancellationToken) => Task.FromResult(true);
        public Task<IReadOnlyCollection<string>> GetAsync(CancellationToken cancellationToken) => Task.FromResult<IReadOnlyCollection<string>>([]);
    }

    private sealed class FakeLdapConnectionTester(bool succeed = true) : ILdapConnectionTester
    {
        public Task<Result<string>> TestConnectionAsync(string host, int port, bool useSsl, string bindDn, string password, int timeoutSeconds, CancellationToken ct)
            => Task.FromResult(succeed
                ? Result<string>.Success("LDAP bağlantısı ve kimlik doğrulama başarılı.")
                : Result<string>.Failure(Error.Failure("ldap.failed", "LDAP sunucusuna erişilemedi")));
    }

    [TestMethod]
    public async Task SwitchDirectorySource_ToLdap_FailsWhenLdapConnectionFails()
    {
        var malatyaSettings = new MalatyaApiSettings();
        malatyaSettings.SetDirectorySyncEnabled(true, "admin", DateTimeOffset.UtcNow);

        var ldapSettings = new DirectorySettings();
        ldapSettings.Change("ldap.mbb.bel.tr", 636, true, "cn=admin", "pwd", "ou=users", "ou=units", "(&(objectClass=user)(sAMAccountName={0}))",
            "(objectClass=organizationalUnit)", "department", "memberOf", "displayName", "mail", 20, true, false, "test", DateTimeOffset.UtcNow);

        var malatyaStore = new FakeMalatyaStore(malatyaSettings);
        var ldapStore = new FakeLdapStore(ldapSettings);
        var protector = new FakeProtector();
        var client = new FakeMalatyaApiClient();
        var uow = new FakeUnitOfWork();
        var permissions = new FakeUserPermissions("operator");
        var ldapTester = new FakeLdapConnectionTester(succeed: false);

        var handler = new MalatyaApiSettingsHandlers(malatyaStore, ldapStore, protector, client, uow, permissions, TimeProvider.System, ldapTester);

        var result = await handler.SwitchDirectorySourceAsync(new SwitchDirectorySourceRequest("Ldap"), default);

        Assert.IsTrue(result.IsFailure);
        Assert.IsTrue(malatyaSettings.IsDirectorySyncEnabled);
        Assert.IsFalse(ldapSettings.IsEnabled);
    }
}

