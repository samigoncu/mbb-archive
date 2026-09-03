using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.OfficialCorrespondence.Application.Eyp;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Presentation;

public static class OfficialCorrespondenceEndpoints
{
    private const long MaxInspectionBytes =
        512L * 1024 * 1024;

    public static IEndpointRouteBuilder MapOfficialCorrespondenceEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/v1/official-correspondence")
            .WithTags("Official Correspondence")
            .RequireAuthorization();

        group.MapPost("/eyp/inspect", InspectEyp)
            .RequireAuthorization("permission:official-correspondence.eyp.inspect");

        group.MapGet("/eyp/inspections/{id:guid}", GetInspection)
            .RequireAuthorization("permission:official-correspondence.eyp.read");

        group.MapGet("/eyp/capabilities", () => Results.Ok(new
        {
            currentTarget = "EYP 2.1",
            opcStructuralInspection = true,
            officialDotNetApi21ValidationAdapter = false,
            packageCreationAdapter = false,
            packageUpdateAdapter = false,
            maxInspectionBytes = MaxInspectionBytes,
            warning = "OPC structural validity is not reported as official EYP conformance."
        }))
        .RequireAuthorization("permission:official-correspondence.eyp.read");

        return endpoints;
    }

    private static async Task<IResult> InspectEyp(
        HttpRequest request,
        InspectEypPackageCommandHandler handler,
        CancellationToken ct)
    {
        var encodedFileName =
            request.Headers["X-File-Name"].ToString();

        var fileName = string.IsNullOrWhiteSpace(encodedFileName)
            ? "package.eyp"
            : Uri.UnescapeDataString(encodedFileName);

        try
        {
            await using var content =
                await TemporaryEypPackageContent.CreateAsync(
                    request.Body,
                    fileName,
                    MaxInspectionBytes,
                    ct);

            var documentId = TryGuidHeader(
                request,
                "X-Document-Id");

            var documentVersionId = TryGuidHeader(
                request,
                "X-Document-Version-Id");

            var result = await handler.Handle(
                new InspectEypPackageCommand(
                    documentId,
                    documentVersionId,
                    content),
                ct);

            return result.IsFailure
                ? ApiResults.Problem(result.Error)
                : Results.Ok(result.Value);
        }
        catch (InvalidDataException ex)
        {
            return Results.BadRequest(new
            {
                error = ex.Message
            });
        }
    }

    private static async Task<IResult> GetInspection(
        Guid id,
        GetEypInspectionQueryHandler handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(
            new GetEypInspectionQuery(id),
            ct);

        return result.IsFailure
            ? ApiResults.Problem(result.Error)
            : Results.Ok(result.Value);
    }

    private static Guid? TryGuidHeader(
        HttpRequest request,
        string headerName)
        => Guid.TryParse(
            request.Headers[headerName].ToString(),
            out var value)
            ? value
            : null;
}
