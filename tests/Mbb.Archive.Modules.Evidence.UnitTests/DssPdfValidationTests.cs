using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Evidence.Domain.Validations;
using Mbb.Archive.Modules.Evidence.Infrastructure.Crypto;

namespace Mbb.Archive.Modules.Evidence.UnitTests;

[TestClass]
public sealed class DssPdfValidationTests
{
    [TestMethod]
    public async Task UnconfiguredProviderNeverSendsDocument()
    {
        var handler = new Provider();
        var result = await new DssPdfSignatureValidator(new HttpClient(handler), Options.Create(new DssValidationOptions()))
            .ValidateAsync("%PDF-test"u8.ToArray(), default);
        Assert.IsFalse(result.ProviderConfigured); Assert.AreEqual(0, handler.Calls);
        Assert.AreEqual(EvidenceValidationStatus.Indeterminate, result.Status);
    }

    [TestMethod]
    public async Task OfficialDssRequestAndPassedReportAreBoundToExactInputName()
    {
        var handler = new Provider(); var validator = Create(handler);
        var result = await validator.ValidateAsync("%PDF-test"u8.ToArray(), default);
        Assert.AreEqual(EvidenceValidationStatus.Valid, result.Status);
        Assert.AreEqual("https://dss.example.invalid/validation/validateSignature", handler.Address);
        Assert.AreEqual(Convert.ToBase64String("%PDF-test"u8), handler.Bytes);
        Assert.IsNotNull(result.ReportJson);
    }

    [TestMethod]
    public async Task ProviderFailureIsNeverValid()
    {
        var result = await Create(new Provider { Status = HttpStatusCode.ServiceUnavailable }).ValidateAsync("%PDF-test"u8.ToArray(), default);
        Assert.AreEqual(EvidenceValidationStatus.Indeterminate, result.Status);
        Assert.IsTrue(result.ProviderConfigured);
    }

    [TestMethod]
    public async Task ReportForDifferentDocumentIsRejected()
    {
        var result = await Create(new Provider { WrongName = true }).ValidateAsync("%PDF-test"u8.ToArray(), default);
        Assert.AreEqual(EvidenceValidationStatus.Indeterminate, result.Status);
    }

    [TestMethod]
    public async Task InvalidAndIndeterminateSignaturesRemainDistinct()
    {
        var invalid = await Create(new Provider { Indication = "TOTAL_FAILED" }).ValidateAsync("%PDF-test"u8.ToArray(), default);
        var unknown = await Create(new Provider { Indication = "INDETERMINATE" }).ValidateAsync("%PDF-test"u8.ToArray(), default);
        Assert.AreEqual(EvidenceValidationStatus.Invalid, invalid.Status);
        Assert.AreEqual(EvidenceValidationStatus.Indeterminate, unknown.Status);
    }

    [TestMethod]
    public void InsecureRemoteConfigurationIsNotEnabled()
    {
        Assert.IsFalse(new DssValidationOptions { BaseUrl = "http://remote.example", AllowLoopbackHttp = true }.IsConfigured);
        Assert.IsFalse(new DssValidationOptions { BaseUrl = "https://user:password@remote.example" }.IsConfigured);
        Assert.IsTrue(new DssValidationOptions { BaseUrl = "http://127.0.0.1:8080", AllowLoopbackHttp = true }.IsConfigured);
    }

    private static DssPdfSignatureValidator Create(Provider provider) => new(new HttpClient(provider),
        Options.Create(new DssValidationOptions { BaseUrl = "https://dss.example.invalid/validation" }));

    private sealed class Provider : HttpMessageHandler
    {
        public int Calls; public string? Address; public string? Bytes;
        public HttpStatusCode Status = HttpStatusCode.OK;
        public bool WrongName; public string Indication = "TOTAL_PASSED";
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++; Address = request.RequestUri!.ToString();
            using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
            var signed = body.RootElement.GetProperty("signedDocument"); Bytes = signed.GetProperty("bytes").GetString();
            var report = new { simpleReport = new { documentName = WrongName ? "another.pdf" : signed.GetProperty("name").GetString(),
                signaturesCount = 1, validSignaturesCount = Indication == "TOTAL_PASSED" ? 1 : 0,
                signatureOrTimestampOrEvidenceRecord = new[] { new { indication = Indication } } } };
            return new HttpResponseMessage(Status) { Content = new StringContent(JsonSerializer.Serialize(report), Encoding.UTF8, "application/json") };
        }
    }
}
