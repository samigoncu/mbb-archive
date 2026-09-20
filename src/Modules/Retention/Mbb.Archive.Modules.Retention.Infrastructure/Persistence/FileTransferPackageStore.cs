using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using Mbb.Archive.Modules.Retention.Application.Disposition;

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence;

internal sealed class FileTransferPackageStore(IConfiguration configuration) : ITransferPackageStore
{
    private string Root => Path.GetFullPath(configuration["Retention:TransferPackages:Root"] ?? "./.local-data/transfer-packages");
    private string FilePath(Guid id) => Path.Combine(Root, $"{id:D}.zip");
    public async Task<TransferPackageArtifact> CreateAsync(Guid id, Func<Stream, CancellationToken, Task> writer, CancellationToken ct)
    {
        Directory.CreateDirectory(Root);
        var path = FilePath(id); var temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None, 128 * 1024, FileOptions.Asynchronous))
            { await writer(stream, ct); await stream.FlushAsync(ct); }
            await using var check = new FileStream(temporary, FileMode.Open, FileAccess.Read, FileShare.Read, 128 * 1024, FileOptions.Asynchronous);
            var hash = Convert.ToHexStringLower(await SHA256.HashDataAsync(check, ct));
            var result = new TransferPackageArtifact(check.Length, hash);
            File.Move(temporary, path, overwrite: false);
            return result;
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
    public Task<Stream?> OpenAsync(Guid id, CancellationToken ct)
        => Task.FromResult<Stream?>(File.Exists(FilePath(id)) ? new FileStream(FilePath(id), FileMode.Open, FileAccess.Read, FileShare.Read, 128 * 1024, FileOptions.Asynchronous) : null);
    public Task DeleteUncommittedAsync(Guid id, CancellationToken ct) { if (File.Exists(FilePath(id))) File.Delete(FilePath(id)); return Task.CompletedTask; }
}
