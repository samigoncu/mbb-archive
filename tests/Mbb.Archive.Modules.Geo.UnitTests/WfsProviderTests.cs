using System.Net;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Infrastructure;
namespace Mbb.Archive.Modules.Geo.UnitTests;
[TestClass]
public sealed class WfsProviderTests
{
    [TestMethod]
    public async Task MalformedSuccessfulResponseIsNotReportedAsEmptySuccess()
    {
        using var services = Create("""{"error":"service failure"}""");
        var result = await services.GetRequiredService<IGeoFeatureProvider>().SearchAsync("roads", "road", 1, default);
        Assert.IsTrue(result.IsFailure);
        Assert.AreEqual("geo.provider_error", result.Error.Code);
    }
    [TestMethod]
    public async Task MissingStableFeatureIdCannotCreateInventedIdentity()
    {
        using var services = Create("""{"features":[{"geometry":{"type":"Point","coordinates":[1,2]},"properties":{"name":"Road"}}]}""");
        var result = await services.GetRequiredService<IGeoFeatureProvider>().SearchAsync("roads", "road", 1, default);
        Assert.IsTrue(result.IsFailure);
    }
    [TestMethod]
    public async Task StableFeatureAndExistingServerQueryArePreserved()
    {
        var handler = new ResponseHandler("""{"features":[{"id":"roads.1","geometry":{"type":"Point","coordinates":[1,2]},"properties":{"name":"Road"}}]}""");
        using var services = Create(handler);
        var result = await services.GetRequiredService<IGeoFeatureProvider>().SearchAsync("roads", "O'Reilly", 1, default);
        Assert.IsTrue(result.IsSuccess);
        Assert.AreEqual("roads.1", result.Value.Single().FeatureId);
        StringAssert.Contains(handler.Uri!.Query, "workspace=public");
        StringAssert.Contains(Uri.UnescapeDataString(handler.Uri.Query), "O''Reilly");
    }
    private static ServiceProvider Create(string body) => Create(new ResponseHandler(body));
    private static ServiceProvider Create(ResponseHandler handler)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> {
            ["ConnectionStrings:Geo"] = "Host=localhost;Database=model-only"
        }).Build();
        var services = new ServiceCollection();
        services.AddGeoModule(config);
        // Servis parolaları Data Protection ile şifreleniyor; testte anahtar
        // halkası diske yazılmasın diye geçici sağlayıcı kullanılır.
        services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider());
        // CBS tanımı artık veritabanından, yönetim ekranı üzerinden gelir;
        // test veritabanına gitmeden aynı anlık görüntüyü verir.
        services.AddSingleton<IGeoRuntimeConfiguration>(new StaticRuntime());
        services.AddSingleton<IHttpClientFactory>(new Factory(handler));
        return services.BuildServiceProvider();
    }
    private sealed class StaticRuntime : IGeoRuntimeConfiguration
    {
        public GeoRuntime Current { get; } = new(
            new GeoRuntimeBasemap("https://tile.invalid/{z}/{x}/{y}.png", "", 38.3552, 38.3095, 12),
            [new GeoRuntimeService(Guid.CreateVersion7(), "Wfs", "CBS", "https://cbs.invalid/wfs?workspace=public",
                null, null, 20,
                [new GeoRuntimeLayer(Guid.CreateVersion7(), "roads", "Yollar", "road", "name", true, 100, null, true)])]);
        public Task RefreshAsync(CancellationToken ct) => Task.CompletedTask;
    }
    private sealed class Factory(ResponseHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }
    private sealed class ResponseHandler(string body) : HttpMessageHandler
    {
        public Uri? Uri { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Uri = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) {Content = new StringContent(body)});
        }
    }
}
