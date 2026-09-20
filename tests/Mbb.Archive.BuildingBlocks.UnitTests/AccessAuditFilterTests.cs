using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application.Auditing;
using Mbb.Archive.BuildingBlocks.Presentation;

namespace Mbb.Archive.BuildingBlocks.UnitTests;

[TestClass]
public sealed class AccessAuditFilterTests
{
    [TestMethod]
    public async Task Keeps_subject_and_display_name_separate()
    {
        var auditor = new RecordingAuditor();
        var context = CreateContext(auditor, null);
        context.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, "opaque-subject"),
            new Claim("name", "Ayşe Yılmaz")], "Test"));
        await new AccessAuditFilter(_ => "access.document-viewed.v1", "document", "id")
            .InvokeAsync(context, _ => ValueTask.FromResult<object?>(Results.Ok()));
        Assert.AreEqual("opaque-subject", auditor.Records.Single().Actor);
        Assert.AreEqual("Ayşe Yılmaz", auditor.Records.Single().ActorDisplayName);
    }

    [TestMethod]
    public async Task Captures_created_resource_id_from_response()
    {
        var auditor = new RecordingAuditor();
        var id = Guid.NewGuid();
        await new AccessAuditFilter(_ => "access.dossier-created.v1", "dossier", null)
            .InvokeAsync(CreateContext(auditor, null), _ => ValueTask.FromResult<object?>(Results.Created("/test", new { id })));
        Assert.AreEqual(id.ToString(), auditor.Records.Single().EntityId);
    }

    [TestMethod]
    public async Task Does_not_extract_resource_id_from_a_failed_response()
    {
        var auditor = new RecordingAuditor();
        await new AccessAuditFilter(_ => "access.dossier-created.v1", "dossier", null)
            .InvokeAsync(CreateContext(auditor, null), _ => ValueTask.FromResult<object?>(Results.BadRequest(new { id = Guid.NewGuid() })));
        Assert.IsNull(auditor.Records.Single().EntityId);
    }

    [TestMethod]
    public async Task Records_successful_access_with_actor_and_entity()
    {
        var auditor = new RecordingAuditor();
        var context = CreateContext(auditor, documentId: "3f2504e0-4f89-11d3-9a0c-0305e82c3301");

        var filter = new AccessAuditFilter(
            _ => "access.document-viewed.v1",
            "document",
            "id");

        await filter.InvokeAsync(context, _ => ValueTask.FromResult<object?>(Results.Ok()));

        var record = auditor.Records.Single();

        Assert.AreEqual("access.document-viewed.v1", record.EventName);
        Assert.AreEqual("document", record.EntityType);
        Assert.AreEqual("3f2504e0-4f89-11d3-9a0c-0305e82c3301", record.EntityId);
        Assert.AreEqual("dev-admin", record.Actor);
        Assert.AreEqual("succeeded", record.Outcome);
    }

    [TestMethod]
    public async Task Marks_forbidden_response_as_denied()
    {
        var auditor = new RecordingAuditor();
        var context = CreateContext(auditor, documentId: null);

        var filter = new AccessAuditFilter(
            _ => "access.document-downloaded.v1",
            "document",
            "id");

        await filter.InvokeAsync(
            context,
            _ => ValueTask.FromResult<object?>(Results.StatusCode(StatusCodes.Status403Forbidden)));

        Assert.AreEqual("denied", auditor.Records.Single().Outcome);
    }

    [TestMethod]
    public async Task Marks_server_error_response_as_failed()
    {
        var auditor = new RecordingAuditor();
        var context = CreateContext(auditor, documentId: null);

        var filter = new AccessAuditFilter(
            _ => "access.document-downloaded.v1",
            "document",
            "id");

        await filter.InvokeAsync(
            context,
            _ => ValueTask.FromResult<object?>(Results.Problem(statusCode: 500)));

        Assert.AreEqual("failed", auditor.Records.Single().Outcome);
    }

    /// <summary>
    /// Denetim yazımındaki hata kullanıcı isteğini düşürmemeli; §13 denetimi
    /// kaydeder ama uygulama akışını kırmaz.
    /// </summary>
    [TestMethod]
    public async Task Auditor_failure_does_not_break_the_request()
    {
        var context = CreateContext(new ThrowingAuditor(), documentId: null);

        var filter = new AccessAuditFilter(
            _ => "access.document-viewed.v1",
            "document",
            "id");

        var expected = Results.Ok();

        var actual = await filter.InvokeAsync(
            context,
            _ => ValueTask.FromResult<object?>(expected));

        Assert.AreSame(expected, actual);
    }

    [TestMethod]
    public async Task Truncates_oversized_user_agent()
    {
        var auditor = new RecordingAuditor();
        var context = CreateContext(auditor, documentId: null);
        context.HttpContext.Request.Headers.UserAgent = new string('a', 500);

        var filter = new AccessAuditFilter(
            _ => "access.document-viewed.v1",
            "document",
            "id");

        await filter.InvokeAsync(context, _ => ValueTask.FromResult<object?>(Results.Ok()));

        Assert.AreEqual(256, auditor.Records.Single().UserAgent!.Length);
    }

    private static EndpointFilterInvocationContext CreateContext(
        IAccessAuditor auditor,
        string? documentId)
    {
        var services = new ServiceCollection();
        services.AddSingleton(auditor);
        services.AddLogging();

        var http = new DefaultHttpContext
        {
            RequestServices = services.BuildServiceProvider()
        };

        http.User = new ClaimsPrincipal(
            new ClaimsIdentity([new Claim("sub", "dev-admin")], "Test"));

        if (documentId is not null)
            http.Request.RouteValues["id"] = documentId;

        return EndpointFilterInvocationContext.Create(http);
    }

    private sealed class RecordingAuditor : IAccessAuditor
    {
        public List<AccessAuditRecord> Records { get; } = [];

        public Task RecordAsync(
            AccessAuditRecord record,
            CancellationToken cancellationToken)
        {
            Records.Add(record);
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingAuditor : IAccessAuditor
    {
        public Task RecordAsync(
            AccessAuditRecord record,
            CancellationToken cancellationToken)
            => throw new InvalidOperationException("broker unavailable");
    }
}
