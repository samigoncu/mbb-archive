using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Api.Infrastructure;

internal sealed class ApiExceptionHandler : IExceptionHandler
{
    private readonly ILogger<ApiExceptionHandler> _logger;

    public ApiExceptionHandler(ILogger<ApiExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var traceId = httpContext.TraceIdentifier;

        if (exception is ConcurrencyConflictException concurrencyException)
        {
            _logger.LogWarning(
                concurrencyException,
                "Optimistic concurrency conflict. TraceId: {TraceId}",
                traceId);

            await WriteProblemAsync(
                httpContext,
                StatusCodes.Status409Conflict,
                "Concurrent change detected",
                concurrencyException.Message,
                "persistence.concurrency_conflict",
                cancellationToken);

            return true;
        }

        if (exception is DomainRuleViolationException domainException)
        {
            _logger.LogWarning(
                domainException,
                "Domain rule conflict. TraceId: {TraceId}",
                traceId);

            await WriteProblemAsync(
                httpContext,
                StatusCodes.Status409Conflict,
                "Business rule conflict",
                domainException.Message,
                "domain.rule_conflict",
                cancellationToken);

            return true;
        }

        _logger.LogError(
            exception,
            "Unhandled exception. TraceId: {TraceId}",
            traceId);

        await WriteProblemAsync(
            httpContext,
            StatusCodes.Status500InternalServerError,
            "Unexpected server error",
            "The request could not be completed.",
            "server.unexpected_error",
            cancellationToken);

        return true;
    }

    private static Task WriteProblemAsync(
        HttpContext context,
        int statusCode,
        string title,
        string detail,
        string code,
        CancellationToken cancellationToken)
    {
        context.Response.StatusCode = statusCode;

        return context.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detail,
                Extensions =
                {
                    ["code"] = code,
                    ["traceId"] = context.TraceIdentifier
                }
            },
            cancellationToken);
    }
}
