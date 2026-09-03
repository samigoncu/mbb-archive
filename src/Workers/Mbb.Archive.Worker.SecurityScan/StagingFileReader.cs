using Microsoft.Extensions.Options;

namespace Mbb.Archive.Worker.SecurityScan;

internal sealed class StagingFileReader
{
    private readonly SecurityScanOptions _options;

    public StagingFileReader(IOptions<SecurityScanOptions> options)
    {
        _options = options.Value;
    }

    public FileStream OpenRead(string storageKey)
    {
        var root = Path.GetFullPath(_options.StagingRootPath);
        var fullPath = ResolveInsideRoot(root, storageKey);

        if (!File.Exists(fullPath))
            throw new FileNotFoundException("Staged file was not found.", fullPath);

        return new FileStream(
            fullPath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 1024 * 1024,
            FileOptions.Asynchronous | FileOptions.SequentialScan);
    }

    private static string ResolveInsideRoot(
        string root,
        string storageKey)
    {
        var fullPath = Path.GetFullPath(
            Path.Combine(
                root,
                storageKey.Replace('/', Path.DirectorySeparatorChar)));

        var normalizedRoot =
            root.TrimEnd(
                Path.DirectorySeparatorChar,
                Path.AltDirectorySeparatorChar)
            + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(normalizedRoot, StringComparison.Ordinal))
            throw new InvalidOperationException("Staging key resolves outside the configured root.");

        return fullPath;
    }
}
