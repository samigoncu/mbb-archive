using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Mbb.Archive.BuildingBlocks.Application.Auditing;

namespace Mbb.Archive.BuildingBlocks.Presentation;

/// <summary>
/// Endpoint'i §13 kapsamındaki erişim denetimine bağlar. Modül Presentation
/// katmanları Host'a bağımlı olmadan bu uzantıyı kullanır; gerçek yazıcı
/// (<see cref="IAccessAuditor"/>) Host tarafından DI'a kaydedilir.
/// </summary>
public sealed record AccessAuditedEndpoint;

public static class AccessAuditExtensions
{
    public static RouteHandlerBuilder WithAccessAudit(
        this RouteHandlerBuilder builder,
        string eventName,
        string entityType,
        string? routeValueKey = null)
        => builder.WithMetadata(new AccessAuditedEndpoint()).AddEndpointFilter(
            new AccessAuditFilter(_ => eventName, entityType, routeValueKey));

    /// <summary>
    /// Olay adı isteğe göre değişen uçlar için (örneğin indirme ile önizleme
    /// aynı route üzerinde ayrışıyorsa) kullanılır.
    /// </summary>
    public static RouteHandlerBuilder WithAccessAudit(
        this RouteHandlerBuilder builder,
        Func<HttpContext, string> eventNameFactory,
        string entityType,
        string? routeValueKey = null)
        => builder.WithMetadata(new AccessAuditedEndpoint()).AddEndpointFilter(
            new AccessAuditFilter(eventNameFactory, entityType, routeValueKey));
}

internal sealed class AccessAuditFilter : IEndpointFilter
{
    private const int UserAgentMaxLength = 256;

    private readonly Func<HttpContext, string> _eventName;
    private readonly string _entityType;
    private readonly string? _routeValueKey;

    internal AccessAuditFilter(
        Func<HttpContext, string> eventName,
        string entityType,
        string? routeValueKey)
    {
        _eventName = eventName;
        _entityType = entityType;
        _routeValueKey = routeValueKey;
    }

    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var result = await next(context);

        var http = context.HttpContext;
        var auditor = http.RequestServices.GetService<IAccessAuditor>();

        if (auditor is null)
            return result;

        var eventName = _eventName(http);

        var record = new AccessAuditRecord(
            eventName,
            _entityType,
            ResolveEntityId(http, result),
            AccessAuditIdentity.Subject(http.User),
            http.Connection.RemoteIpAddress?.ToString(),
            Truncate(http.Request.Headers.UserAgent.ToString()),
            http.TraceIdentifier,
            ResolveOutcome(result),
            AccessAuditIdentity.DisplayName(http.User));

        try
        {
            await auditor.RecordAsync(record, http.RequestAborted);
        }
        catch (Exception exception)
        {
            // Denetim yazımı kullanıcı isteğini düşürmez; kayıp görünür kalsın diye loglanır.
            http.RequestServices
                .GetService<ILoggerFactory>()
                ?.CreateLogger("Mbb.Archive.AccessAudit")
                .LogError(
                    exception,
                    "Access audit record {EventName} could not be written.",
                    eventName);
        }

        return result;
    }

    private string? ResolveEntityId(HttpContext http, object? result)
    {
        if (_routeValueKey is not null && http.Request.RouteValues.TryGetValue(_routeValueKey, out var value))
            return value?.ToString();
        // Creation routes have no route id. Read only the public result id, never the request body.
        if (ResolveOutcome(result) == "succeeded" && result is IValueHttpResult { Value: { } body })
        {
            var property = body.GetType().GetProperties().FirstOrDefault(p => p.Name.Equals("id", StringComparison.OrdinalIgnoreCase));
            if (property?.GetValue(body) is Guid id) return id.ToString();
        }
        return null;
    }

    /// <summary>
    /// Sonuç nesnesi durum kodu taşımıyorsa istek başarılı sayılır; stream
    /// sonuçları durum kodu arabirimini uygulamaz.
    /// </summary>
    private static string ResolveOutcome(object? result)
        => result is IStatusCodeHttpResult { StatusCode: >= 400 } statusCode
            ? statusCode.StatusCode is 401 or 403 ? "denied" : "failed"
            : "succeeded";

    private static string? Truncate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return value.Length <= UserAgentMaxLength
            ? value
            : value[..UserAgentMaxLength];
    }
}
