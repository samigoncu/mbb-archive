using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Net.Http.Headers;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Operations.Application.Branding;
using Mbb.Archive.Modules.Operations.Domain.Branding;

namespace Mbb.Archive.Modules.Operations.Presentation;

public static class BrandingEndpoints
{
    /// <summary>
    /// Görsel dosyası JSON gövdesinde base64 taşınır: API'nin başka hiçbir ucu
    /// multipart almıyor, 1 MB sınırıyla tek biçim korumak daha ucuz.
    /// </summary>
    private sealed record UploadAssetRequest(string FileName, string ContentType, string ContentBase64);

    public static IEndpointRouteBuilder MapBrandingEndpoints(this IEndpointRouteBuilder endpoints)
    {
        // Kurum kimliği giriş ekranında da gerekli; okuma uçları kimlik istemez.
        var group = endpoints.MapGroup("/api/v1/operations/branding").WithTags("Branding");

        group.MapGet("/", async (BrandingHandler handler, CancellationToken ct)
            => Results.Ok(await handler.GetAsync(ct)));

        group.MapGet("/assets/{kind}", async (string kind, BrandingHandler handler, CancellationToken ct) =>
        {
            var asset = await handler.GetAssetContentAsync(kind, ct);
            return asset is null
                ? Results.NotFound()
                : Results.Bytes(asset.Content, asset.ContentType,
                    lastModified: asset.UpdatedAt, entityTag: EntityTagHeaderValue.Parse(asset.ETag));
        });

        group.MapPut("/", async (UpdateBranding request, BrandingHandler handler, CancellationToken ct) =>
        {
            var result = await handler.UpdateAsync(request, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:access.admin");

        group.MapPut("/assets/{kind}", async (string kind, UploadAssetRequest request, BrandingHandler handler, CancellationToken ct) =>
        {
            byte[] content;
            try { content = Convert.FromBase64String(request.ContentBase64 ?? ""); }
            catch (FormatException)
            {
                return ApiResults.Problem(Error.Validation(
                    "operations.branding_asset_invalid", "Görsel içeriği okunamadı."));
            }

            if (content.LongLength > BrandingAsset.MaxBytes)
                return ApiResults.Problem(Error.Validation(
                    "operations.branding_asset_too_large", $"Görsel en fazla {BrandingAsset.MaxBytes / 1024} KB olabilir."));

            var result = await handler.UploadAssetAsync(kind, content, request.ContentType, request.FileName, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:access.admin");

        group.MapDelete("/assets/{kind}", async (string kind, BrandingHandler handler, CancellationToken ct) =>
        {
            var result = await handler.DeleteAssetAsync(kind, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:access.admin");

        return endpoints;
    }
}
