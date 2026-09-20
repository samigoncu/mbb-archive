using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Evidence.Application.Validations;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;
using Microsoft.Extensions.Configuration;

namespace Mbb.Archive.Modules.Evidence.Presentation;

public static class EvidenceEndpoints
{
    private const int MaxDecodedBytes = 32 * 1024 * 1024;

    public static IEndpointRouteBuilder MapEvidenceEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/v1/evidence")
            .WithTags("Evidence")
            .RequireAuthorization();

        group.MapPost("/cms/validate", ValidateCms)
            .RequireAuthorization("permission:evidence.validate");

        group.MapPost("/timestamp/validate", ValidateTimestamp)
            .RequireAuthorization("permission:evidence.validate");

        group.MapPost("/timestamp/request", RequestTimestamp)
            .RequireAuthorization("permission:evidence.timestamp.request");

        group.MapPost("/pdf/validate", ValidatePdf)
            .RequireAuthorization("permission:evidence.validate");

        group.MapGet("/validations", GetValidations)
            .RequireAuthorization("permission:evidence.read");

        group.MapGet("/validations/{id:guid}", GetValidation)
            .RequireAuthorization("permission:evidence.read");

        group.MapGet("/capabilities", (IPdfSignatureValidator pdf, IConfiguration configuration) => Results.Ok(new
        {
            cms = ".NET SignedCms",
            rfc3161 = ".NET Rfc3161TimestampToken",
            pdfPades = pdf.IsConfigured ? "Kurum DSS doğrulama servisi" : "Kurum DSS sağlayıcısı yapılandırılmamış",
            pdfPadesConfigured = pdf.IsConfigured,
            timestampAuthorityConfigured = !string.IsNullOrWhiteSpace(configuration["Evidence:TimestampAuthority:Url"]),
            maxInlineDecodedBytes = MaxDecodedBytes
        }))
        .RequireAuthorization("permission:evidence.read");

        return endpoints;
    }

    private static async Task<IResult> ValidateCms(
        CmsRequest request,
        EvidenceCommandHandlers handler,
        CancellationToken ct)
    {
        if (!TryDecode(request.SignatureBase64, out var signature, out var error))
            return Results.BadRequest(new { error });

        byte[]? content = null;

        if (!string.IsNullOrWhiteSpace(request.DetachedContentBase64)
            && !TryDecode(request.DetachedContentBase64, out content, out error))
        {
            return Results.BadRequest(new { error });
        }

        var result = await handler.Handle(
            new ValidateCmsSignatureCommand(
                request.DocumentId,
                request.DocumentVersionId,
                signature!,
                content),
            ct);

        return FromResult(result);
    }

    private static async Task<IResult> ValidateTimestamp(
        TimestampValidationRequest request,
        EvidenceCommandHandlers handler,
        CancellationToken ct)
    {
        if (!TryDecode(request.TokenBase64, out var token, out var error))
            return Results.BadRequest(new { error });

        if (!TryDecode(request.DataBase64, out var data, out error))
            return Results.BadRequest(new { error });

        var result = await handler.Handle(
            new ValidateTimestampCommand(
                request.DocumentId,
                request.DocumentVersionId,
                token!,
                data!),
            ct);

        return FromResult(result);
    }

    private static async Task<IResult> RequestTimestamp(
        TimestampRequest request,
        EvidenceCommandHandlers handler,
        CancellationToken ct)
    {
        if (!TryDecode(request.DataBase64, out var data, out var error))
            return Results.BadRequest(new { error });

        var result = await handler.Handle(
            new RequestTimestampCommand(data!),
            ct);

        return FromResult(result);
    }

    private static async Task<IResult> ValidatePdf(
        PdfRequest request,
        EvidenceCommandHandlers handler,
        CancellationToken ct)
    {
        if (!TryDecode(request.PdfBase64, out var pdf, out var error))
            return Results.BadRequest(new { error });

        var result = await handler.Handle(
            new ValidatePdfSignatureCommand(
                request.DocumentId,
                request.DocumentVersionId,
                pdf!),
            ct);

        return FromResult(result);
    }

    private static async Task<IResult> GetValidations(
        int? page,
        int? pageSize,
        string? kind,
        string? status,
        Guid? documentId,
        GetEvidenceValidationsQueryHandler handler,
        CancellationToken ct)
        => FromResult(
            await handler.Handle(
                new GetEvidenceValidationsQuery(
                    page ?? 1,
                    pageSize ?? 25,
                    kind,
                    status,
                    documentId),
                ct));

    private static async Task<IResult> GetValidation(
        Guid id,
        GetEvidenceValidationQueryHandler handler,
        CancellationToken ct)
        => FromResult(
            await handler.Handle(
                new GetEvidenceValidationQuery(id),
                ct));

    private static bool TryDecode(
        string? base64,
        out byte[]? bytes,
        out string? error)
    {
        bytes = null;
        error = null;

        if (string.IsNullOrWhiteSpace(base64))
        {
            error = "Base64 payload is required.";
            return false;
        }

        if (base64.Length > MaxDecodedBytes * 2)
        {
            error = "Inline evidence payload is too large.";
            return false;
        }

        try
        {
            bytes = Convert.FromBase64String(base64);

            if (bytes.Length > MaxDecodedBytes)
            {
                error = "Inline evidence payload exceeds the size limit.";
                bytes = null;
                return false;
            }

            return true;
        }
        catch (FormatException)
        {
            error = "Payload is not valid Base64.";
            return false;
        }
    }

    private static IResult FromResult<T>(Result<T> result)
        => result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Ok(result.Value);

    private sealed record CmsRequest(
        Guid? DocumentId,
        Guid? DocumentVersionId,
        string SignatureBase64,
        string? DetachedContentBase64);

    private sealed record TimestampValidationRequest(
        Guid? DocumentId,
        Guid? DocumentVersionId,
        string TokenBase64,
        string DataBase64);

    private sealed record TimestampRequest(string DataBase64);

    private sealed record PdfRequest(
        Guid? DocumentId,
        Guid? DocumentVersionId,
        string PdfBase64);
}
