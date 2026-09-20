using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.Modules.Audit.Infrastructure;
namespace Mbb.Archive.Modules.Audit.Presentation;
public static class AuditEndpoints
{
    public static IEndpointRouteBuilder MapAuditEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/audit/events", async (
            string? eventName, Guid? documentId, string? actor,
            DateTimeOffset? from, DateTimeOffset? to, long? before, int? take, string? activity,
            AuditJournalQueries queries, CancellationToken ct) =>
        {
            if (activity is not null and not "user" and not "system" and not "all")
                return Results.BadRequest(new { detail = "Geçersiz işlem grubu." });
            if (from > to)
                return Results.BadRequest(new { detail = "Başlangıç tarihi bitişten sonra olamaz." });
            return Results.Ok(await queries.ReadAsync(eventName, documentId, actor,
                from, to, before, take ?? 100, ct, activity));
        }).WithTags("Audit").RequireAuthorization("permission:audit.read");
        endpoints.MapGet("/api/v1/audit/activity", async (DateTimeOffset from, DateTimeOffset to,
            string? actor, AuditJournalQueries queries, CancellationToken ct) =>
        {
            if (from >= to || to - from > TimeSpan.FromDays(366))
                return Results.BadRequest(new {detail = "Rapor aralığı 1 ile 366 gün arasında olmalıdır."});
            var rows = await queries.ActivityAsync(from, to, string.IsNullOrWhiteSpace(actor) ? null : actor, ct);
            return Results.Ok(new { items = rows.Take(1000), isTruncated = rows.Count > 1000 });
        }).WithTags("Audit").RequireAuthorization("permission:audit.read");
        return endpoints;
    }
}
