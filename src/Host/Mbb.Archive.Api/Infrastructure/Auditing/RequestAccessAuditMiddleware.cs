using Mbb.Archive.BuildingBlocks.Application.Auditing;
using Mbb.Archive.BuildingBlocks.Presentation;
namespace Mbb.Archive.Api.Infrastructure.Auditing;
internal sealed class RequestAccessAuditMiddleware(RequestDelegate next, ILogger<RequestAccessAuditMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, IAccessAuditor auditor)
    {
        await next(context);
        if (!context.Request.Path.StartsWithSegments("/api/v1")) return;
        var denied = context.Response.StatusCode is 401 or 403;
        var read = HttpMethods.IsGet(context.Request.Method) && context.Response.StatusCode is >= 200 and < 300
            && !context.Request.Path.StartsWithSegments("/api/v1/audit")
            && context.GetEndpoint()?.Metadata.GetMetadata<AccessAuditedEndpoint>() is null;
        if (!denied && !read) return;
        try
        {
            await auditor.RecordAsync(new AccessAuditRecord(denied ? "access.request-denied.v1" : "access.resource-viewed.v1", "request",
                context.Request.Path.Value, AccessAuditIdentity.Subject(context.User),
                context.Connection.RemoteIpAddress?.ToString(), null, context.TraceIdentifier, denied ? "denied" : "succeeded",
                AccessAuditIdentity.DisplayName(context.User)), context.RequestAborted);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Request access could not be added to the audit journal.");
        }
    }
}
