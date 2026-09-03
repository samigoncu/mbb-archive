using Mbb.Archive.Modules.OfficialCorrespondence.Application.Abstractions;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Presentation;

internal sealed class TemporaryEypPackageContent :
    IEypPackageContent,
    IAsyncDisposable
{
    private readonly string _path;

    private TemporaryEypPackageContent(
        string path,
        string fileName)
    {
        _path = path;
        FileName = fileName;
    }

    public string FileName { get; }

    public static async Task<TemporaryEypPackageContent> CreateAsync(
        Stream source,
        string fileName,
        long maxBytes,
        CancellationToken cancellationToken)
    {
        var path = Path.Combine(
            Path.GetTempPath(),
            $"mbb-eyp-{Guid.CreateVersion7():N}.tmp");

        try
        {
            await using var destination = new FileStream(
                path,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 1024 * 1024,
                FileOptions.Asynchronous | FileOptions.SequentialScan);

            var buffer = new byte[1024 * 1024];
            long total = 0;

            while (true)
            {
                var read = await source.ReadAsync(buffer, cancellationToken);

                if (read == 0)
                    break;

                total += read;

                if (total > maxBytes)
                    throw new InvalidDataException("EYP upload exceeds the inspection size limit.");

                await destination.WriteAsync(
                    buffer.AsMemory(0, read),
                    cancellationToken);
            }

            await destination.FlushAsync(cancellationToken);

            return new TemporaryEypPackageContent(
                path,
                string.IsNullOrWhiteSpace(fileName)
                    ? "package.eyp"
                    : fileName);
        }
        catch
        {
            if (File.Exists(path))
                File.Delete(path);

            throw;
        }
    }

    public Task<Stream> OpenReadAsync(
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        Stream stream = new FileStream(
            _path,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 1024 * 1024,
            FileOptions.Asynchronous | FileOptions.SequentialScan);

        return Task.FromResult(stream);
    }

    public ValueTask DisposeAsync()
    {
        try
        {
            if (File.Exists(_path))
                File.Delete(_path);
        }
        catch
        {
            // Temporary file cleanup is best effort. OS temp cleanup remains a fallback.
        }

        return ValueTask.CompletedTask;
    }
}
