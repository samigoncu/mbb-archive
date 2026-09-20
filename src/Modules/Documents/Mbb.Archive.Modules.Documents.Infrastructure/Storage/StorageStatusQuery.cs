using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Settings;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Storage;

/// <summary>
/// Depolama durumunu veritabanı sayımlarından ve yerel birimden okur.
/// </summary>
/// <remarks>
/// Nesne sayısı ve boyutu diski ya da kovayı taramadan, arşiv kayıtlarından
/// türetilir: S3'te listeleme pahalıdır ve asıl sorulan "arşivde ne var",
/// "dizinde ne duruyor" değildir. Birim doluluğu yalnız yerel sağlayıcıda
/// anlamlıdır ve dosya sisteminden alınır.
/// </remarks>
internal sealed class StorageStatusQuery(
    DocumentsDbContext db,
    IOptions<OriginalStorageOptions> storage,
    IOptions<FileStagingOptions> staging,
    IOriginalObjectStorage objectStorage) : IStorageStatusQuery
{
    public async Task<StorageStatus> GetAsync(CancellationToken ct)
    {
        var options = storage.Value;
        var local = !string.Equals(options.Provider, "S3", StringComparison.OrdinalIgnoreCase);

        // Aynı içerik tek nesne olarak saklanır; sayım anahtara göre tekilleştirilir.
        var perObject = await db.Set<DocumentVersion>()
            .AsNoTracking()
            .Where(x => x.StorageKey != "")
            .GroupBy(x => x.StorageKey)
            .Select(g => new { Bytes = g.Max(x => x.SizeBytes), References = g.Count() })
            .ToListAsync(ct);

        var storedBytes = perObject.Sum(x => x.Bytes);
        var referencedBytes = perObject.Sum(x => x.Bytes * x.References);

        var (reachable, problem) = await ProbeAsync(ct);

        return new StorageStatus(
            local ? "Local" : "S3",
            local ? Path.GetFullPath(options.LocalRootPath) : options.S3.BucketName,
            perObject.Count,
            storedBytes,
            perObject.Sum(x => x.References),
            referencedBytes - storedBytes,
            new WormStatus(options.Worm.Enabled, options.Worm.Mode, options.Worm.RetentionDays, Supported: !local),
            local ? Volume(options.LocalRootPath) : null,
            Staging(staging.Value.RootPath),
            reachable,
            problem);
    }

    /// <summary>Depoya gerçekten ulaşılabiliyor mu; okunamayan arşiv, olmayan arşivdir.</summary>
    private async Task<(bool Reachable, string? Problem)> ProbeAsync(CancellationToken ct)
    {
        try
        {
            // Var olmayan bir anahtar okunur: sağlıklı depo null döner,
            // erişilemeyen depo hata fırlatır. Nesne yazmadan sınar.
            var probe = await objectStorage.OpenReadAsync("__health__/probe", ct);
            if (probe is not null) await probe.DisposeAsync();
            return (true, null);
        }
        catch (Exception exception)
        {
            return (false, exception.Message);
        }
    }

    private static VolumeStatus? Volume(string rootPath)
    {
        try
        {
            var root = Path.GetFullPath(rootPath);
            Directory.CreateDirectory(root);
            var drive = new DriveInfo(Path.GetPathRoot(root) ?? root);
            return new VolumeStatus(root, drive.TotalSize, drive.AvailableFreeSpace);
        }
        catch
        {
            // Birim bilgisi alınamaması panelin tamamını düşürmemeli.
            return null;
        }
    }

    private static StagingStatus Staging(string rootPath)
    {
        var root = Path.GetFullPath(rootPath);

        try
        {
            if (!Directory.Exists(root)) return new StagingStatus(root, 0, 0);

            var files = new DirectoryInfo(root).EnumerateFiles("*", SearchOption.AllDirectories).ToArray();
            return new StagingStatus(root, files.Length, files.Sum(x => x.Length));
        }
        catch
        {
            return new StagingStatus(root, 0, 0);
        }
    }
}
