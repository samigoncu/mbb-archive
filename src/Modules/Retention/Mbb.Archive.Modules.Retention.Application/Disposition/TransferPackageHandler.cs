using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Contracts;
using Mbb.Archive.Modules.Retention.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Retention.Domain.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.Application.Disposition;

public sealed record TransferPackageArtifact(long Size, string Sha256);
public interface ITransferPackageStore
{
    Task<TransferPackageArtifact> CreateAsync(Guid id, Func<Stream, CancellationToken, Task> writer, CancellationToken ct);
    Task<Stream?> OpenAsync(Guid id, CancellationToken ct);
    Task DeleteUncommittedAsync(Guid id, CancellationToken ct);
}

public sealed record TransferManifest(string Format, Guid PackageId, Guid ProcessId, Guid DocumentId,
    string Title, string MetadataJson, string CommissionReference, string RetentionRule,
    DateTimeOffset CreatedAt, string CreatedBy, IReadOnlyList<TransferManifestFile> Files);
public sealed record TransferManifestFile(string Path, Guid VersionId, int VersionNumber, string MimeType,
    long SizeBytes, string Sha256Hash);

public sealed class TransferPackageHandler(IDispositionRepository processes, IRetentionRepository cases,
    IArchiveTransferSource source, ITransferPackageStore store, IDocumentVisibility visibility,
    ICurrentUserPermissions user, IUnitOfWork<RetentionBoundary> unitOfWork, IOutbox<RetentionBoundary> outbox, TimeProvider time)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<Result<Guid>> Create(Guid id, long expectedVersion, CancellationToken ct)
    {
        var process = await VisibleProcess(id, ct);
        if (process is null) return Result<Guid>.Failure(NotFound());
        if (process.ConcurrencyVersion != expectedVersion) return Result<Guid>.Failure(Stale());
        if (process.Status != DispositionProcessStatus.Approved || process.Action != DispositionAction.Transfer)
            return Result<Guid>.Failure(Error.Conflict("retention.package_not_allowed", "Paket yalnız onaylı devir için hazırlanabilir."));
        if (process.TransferPackageId is Guid existing) return Result<Guid>.Success(existing);
        var retentionCase = await cases.GetCaseAsync(process.RetentionCaseId, ct);
        var document = await source.GetAsync(process.DocumentId, ct);
        if (retentionCase is null || document is null || document.Versions.Count == 0)
            return Result<Guid>.Failure(Error.Conflict("retention.source_missing", "Arşiv kaynağı ve bütün dijital sürümleri bulunmalıdır."));
        var packageId = Guid.CreateVersion7();
        try
        {
            retentionCase.EnsureDispositionAllowed(time.GetUtcNow());
            var files = document.Versions.OrderBy(x => x.VersionNumber).Select(x => new TransferManifestFile(
                $"originals/{x.VersionId:D}.bin", x.VersionId, x.VersionNumber, x.MimeType, x.SizeBytes, x.Sha256Hash.ToLowerInvariant())).ToArray();
            if (files.Select(x => x.VersionId).Distinct().Count() != files.Length || files.Any(x => x.SizeBytes < 0 || x.Sha256Hash.Length != 64))
                throw new InvalidDataException("Kaynak sürümlerin boyut veya bütünlük bilgisi geçersiz.");
            if (files.Sum(x => x.SizeBytes) > 2L * 1024 * 1024 * 1024 - 16 * 1024 * 1024)
                throw new InvalidDataException("Bu devir paketi 2 GiB aktarım sınırını aşıyor. Paket sınırı artırılmadan hazırlama ve teslim başlatılamaz.");
            var manifest = new TransferManifest("mbb.archive-transfer.v1", packageId, process.Id, process.DocumentId,
                document.Title, document.MetadataJson, process.CommissionReference, retentionCase.RuleCode,
                time.GetUtcNow(), user.Subject, files);
            var manifestBytes = JsonSerializer.SerializeToUtf8Bytes(manifest, JsonOptions);
            var artifact = await store.CreateAsync(packageId, async (target, token) =>
            {
                using var zip = new ZipArchive(target, ZipArchiveMode.Create, leaveOpen: true);
                await using (var entry = zip.CreateEntry("manifest.json").Open()) await entry.WriteAsync(manifestBytes, token);
                foreach (var file in files)
                {
                    await using var original = await source.OpenOriginalAsync(process.DocumentId, file.VersionId, token)
                        ?? throw new InvalidDataException("Pakete alınacak asıl dosya bulunamadı.");
                    await using var entry = zip.CreateEntry(file.Path, CompressionLevel.NoCompression).Open();
                    var actual = await CopyAndHash(original, entry, file.SizeBytes, token);
                    if (actual.Size != file.SizeBytes || actual.Sha256 != file.Sha256Hash)
                        throw new InvalidDataException("Asıl dosyanın SHA-256 veya boyut doğrulaması başarısız; paket oluşturulmadı.");
                }
            }, ct);
            process.RegisterTransferPackage(packageId, Encoding.UTF8.GetString(manifestBytes),
                Convert.ToHexStringLower(SHA256.HashData(manifestBytes)), artifact.Sha256, artifact.Size, user.Subject, retentionCase, time.GetUtcNow());
            Publish(process, "TransferPackageCreated");
            await unitOfWork.SaveChangesAsync(ct);
            return Result<Guid>.Success(packageId);
        }
        catch (Exception exception) when (exception is DomainRuleViolationException or InvalidDataException)
        {
            await store.DeleteUncommittedAsync(packageId, ct);
            return Result<Guid>.Failure(Error.Conflict("retention.package_invalid", exception.Message));
        }
        catch
        {
            await store.DeleteUncommittedAsync(packageId, CancellationToken.None);
            throw;
        }
    }

    public async Task<Result<Stream>> Open(Guid id, CancellationToken ct)
    {
        var process = await VisibleProcess(id, ct);
        if (process?.TransferPackageId is not Guid packageId) return Result<Stream>.Failure(NotFound());
        var stream = await store.OpenAsync(packageId, ct);
        return stream is null ? Result<Stream>.Failure(Error.NotFound("retention.package_missing", "Paket dosyası bulunamadı.")) : Result<Stream>.Success(stream);
    }

    public async Task<Result> Verify(Guid id, Guid packageId, long expectedVersion, Stream uploaded, CancellationToken ct)
    {
        var process = await VisibleProcess(id, ct);
        if (process is null) return Result.Failure(NotFound());
        if (process.ConcurrencyVersion != expectedVersion) return Result.Failure(Stale());
        if (process.TransferPackageId != packageId || process.TransferPackageSize is not long size
            || process.TransferManifestJson is null || process.TransferManifestSha256 is null)
            return Result.Failure(Error.Conflict("retention.package_missing", "Bu işleme ait hazırlanmış paket seçilmelidir."));
        var item = await cases.GetCaseAsync(process.RetentionCaseId, ct);
        if (item is null) return Result.Failure(NotFound());
        try
        {
            // Exact ZIP digest commits to the manifest AND every original byte verified at creation.
            // No archive extraction is needed, so uploaded paths and decompression cannot escape or exhaust storage.
            var uploadedHash = await CopyAndHash(uploaded, Stream.Null, size, ct);
            var manifestHash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(process.TransferManifestJson)));
            var manifest = JsonSerializer.Deserialize<TransferManifest>(process.TransferManifestJson, JsonOptions);
            if (uploadedHash.Size != size || uploadedHash.Sha256 != process.TransferPackageSha256
                || manifestHash != process.TransferManifestSha256 || manifest?.PackageId != packageId || manifest.ProcessId != id)
                return Result.Failure(Error.Conflict("retention.package_hash_mismatch", "Paket veya manifest değişmiş; teslim doğrulanamadı."));
            process.VerifyTransferPackage(packageId, user.Subject, item, time.GetUtcNow());
            Publish(process, "TransferPackageVerified"); await unitOfWork.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (Exception exception) when (exception is DomainRuleViolationException or InvalidDataException)
        { return Result.Failure(Error.Conflict("retention.package_invalid", exception.Message)); }
    }

    internal static async Task<TransferPackageArtifact> CopyAndHash(Stream source, Stream target, long maximum, CancellationToken ct)
    {
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        var buffer = new byte[128 * 1024]; long total = 0;
        while (true)
        {
            var read = await source.ReadAsync(buffer, ct); if (read == 0) break;
            total += read; if (total > maximum) throw new InvalidDataException("Dosya beklenen boyutu aşıyor.");
            hash.AppendData(buffer, 0, read); await target.WriteAsync(buffer.AsMemory(0, read), ct);
        }
        return new(total, Convert.ToHexStringLower(hash.GetHashAndReset()));
    }

    private async Task<DispositionProcess?> VisibleProcess(Guid id, CancellationToken ct)
    {
        var process = await processes.GetAsync(id, ct);
        return process is null || !(await visibility.FilterAsync([process.DocumentId], ct)).Contains(process.DocumentId) ? null : process;
    }
    private void Publish(DispositionProcess process, string operation) => outbox.Enqueue(new DispositionChangedIntegrationEvent(
        Guid.CreateVersion7(), process.Id, process.RetentionCaseId, process.DocumentId, process.Action.ToString(), operation,
        process.Status.ToString(), process.Status.ToString(), user.Subject, "", process.TransferPackageSha256 ?? "", process.ConcurrencyVersion, time.GetUtcNow()));
    private static Error NotFound() => Error.NotFound("retention.process_not_found", "İşlem bulunamadı.");
    private static Error Stale() => Error.Conflict("retention.stale_version", "İşlem değişmiş. Güncel kaydı yükleyin.");
}
