using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Operations.Domain.Branding;

namespace Mbb.Archive.Modules.Operations.Application.Branding;

public interface IBrandingStore
{
    Task<BrandingSettings> GetSettingsAsync(CancellationToken ct);
    Task<IReadOnlyList<BrandingAsset>> GetAssetsAsync(CancellationToken ct);
    Task<BrandingAsset?> GetAssetAsync(string kind, CancellationToken ct);
    void Add(BrandingAsset asset);
    void Remove(BrandingAsset asset);
}

/// <summary>Bir görselin nereden geldiği: yüklenen dosya, dış adres ya da uygulamayla gelen varsayılan.</summary>
public sealed record BrandingAssetView(
    string Kind,
    string Source,
    string? Url,
    string? FileName,
    long? SizeBytes,
    DateTimeOffset? UpdatedAt);

public sealed record BrandingDetails(
    string SiteTitle,
    string InstitutionName,
    string Description,
    string? DepartmentName,
    BrandingAssetView Logo,
    BrandingAssetView Favicon,
    BrandingAssetView LoginImage,
    long Version,
    string UpdatedBy,
    DateTimeOffset? UpdatedAt);

public sealed record UpdateBranding(
    string SiteTitle,
    string InstitutionName,
    string Description,
    string? DepartmentName,
    string? LogoUrl,
    string? FaviconUrl,
    string? LoginImageUrl,
    long ExpectedVersion);

public sealed record BrandingAssetContent(byte[] Content, string ContentType, string ETag, DateTimeOffset UpdatedAt);

public sealed class BrandingHandler(
    IBrandingStore store,
    ICurrentUserPermissions permissions,
    IUnitOfWork<OperationsBoundary> uow,
    TimeProvider time)
{
    public async Task<BrandingDetails> GetAsync(CancellationToken ct)
    {
        var settings = await store.GetSettingsAsync(ct);
        var assets = await store.GetAssetsAsync(ct);

        BrandingAssetView View(string kind, string? url)
        {
            var asset = assets.FirstOrDefault(x => x.Kind == kind);
            if (asset is not null)
                return new(kind, "upload", AssetUrl(kind, asset.Version), asset.FileName, asset.Content.LongLength, asset.UpdatedAt);
            return string.IsNullOrEmpty(url)
                ? new(kind, "default", null, null, null, null)
                : new(kind, "url", url, null, null, null);
        }

        return new(
            settings.SiteTitle,
            settings.InstitutionName,
            settings.Description,
            settings.DepartmentName,
            View(BrandingAssetKind.Logo, settings.LogoUrl),
            View(BrandingAssetKind.Favicon, settings.FaviconUrl),
            View(BrandingAssetKind.LoginImage, settings.LoginImageUrl),
            settings.Version,
            settings.UpdatedBy,
            settings.UpdatedAt);
    }

    public async Task<Result<BrandingDetails>> UpdateAsync(UpdateBranding request, CancellationToken ct)
    {
        if (await Forbidden(ct) is { } denied) return Result<BrandingDetails>.Failure(denied);

        var settings = await store.GetSettingsAsync(ct);
        if (request.ExpectedVersion != settings.Version)
            return Result<BrandingDetails>.Failure(Error.Conflict("operations.branding_conflict",
                "Kurum kimliği başka bir yönetici tarafından değiştirildi. Sayfayı yenileyin."));

        try
        {
            settings.Change(request.SiteTitle, request.InstitutionName, request.Description,
                request.DepartmentName, request.LogoUrl, request.FaviconUrl, request.LoginImageUrl, permissions.Subject, time.GetUtcNow());
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<BrandingDetails>.Failure(Error.Validation("operations.branding_invalid", exception.Message));
        }

        await uow.SaveChangesAsync(ct);
        return Result<BrandingDetails>.Success(await GetAsync(ct));
    }

    public async Task<Result<BrandingDetails>> UploadAssetAsync(
        string kind, byte[] content, string contentType, string fileName, CancellationToken ct)
    {
        if (await Forbidden(ct) is { } denied) return Result<BrandingDetails>.Failure(denied);
        if (!BrandingAssetKind.IsKnown(kind))
            return Result<BrandingDetails>.Failure(Error.Validation("operations.branding_kind_invalid", "Geçersiz görsel türü."));

        try
        {
            var normalized = BrandingAssetKind.Normalize(kind);
            var existing = await store.GetAssetAsync(normalized, ct);
            if (existing is null)
                store.Add(BrandingAsset.Create(normalized, content, contentType, fileName, permissions.Subject, time.GetUtcNow()));
            else
                existing.Replace(content, contentType, fileName, permissions.Subject, time.GetUtcNow());
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<BrandingDetails>.Failure(Error.Validation("operations.branding_asset_invalid", exception.Message));
        }

        await uow.SaveChangesAsync(ct);
        return Result<BrandingDetails>.Success(await GetAsync(ct));
    }

    /// <summary>Yüklenen görseli kaldırır; adres alanı doluysa ona, değilse varsayılana döner.</summary>
    public async Task<Result<BrandingDetails>> DeleteAssetAsync(string kind, CancellationToken ct)
    {
        if (await Forbidden(ct) is { } denied) return Result<BrandingDetails>.Failure(denied);
        if (!BrandingAssetKind.IsKnown(kind))
            return Result<BrandingDetails>.Failure(Error.Validation("operations.branding_kind_invalid", "Geçersiz görsel türü."));

        var asset = await store.GetAssetAsync(BrandingAssetKind.Normalize(kind), ct);
        if (asset is not null)
        {
            store.Remove(asset);
            await uow.SaveChangesAsync(ct);
        }

        return Result<BrandingDetails>.Success(await GetAsync(ct));
    }

    public async Task<BrandingAssetContent?> GetAssetContentAsync(string kind, CancellationToken ct)
    {
        if (!BrandingAssetKind.IsKnown(kind)) return null;
        var asset = await store.GetAssetAsync(BrandingAssetKind.Normalize(kind), ct);
        return asset is null ? null : new(asset.Content, asset.ContentType, $"\"{asset.Kind}-{asset.Version}\"", asset.UpdatedAt);
    }

    internal static string AssetUrl(string kind, long version)
        => $"/api/v1/operations/branding/assets/{kind}?v={version}";

    private async Task<Error?> Forbidden(CancellationToken ct)
        => await permissions.HasAllPermissionsAsync(ct)
           || (await permissions.GetAsync(ct)).Contains("access.admin", StringComparer.OrdinalIgnoreCase)
            ? null
            : new Error("operations.branding_forbidden", "Kurum kimliğini yalnız sistem yöneticisi değiştirebilir.", ErrorType.Forbidden);
}
