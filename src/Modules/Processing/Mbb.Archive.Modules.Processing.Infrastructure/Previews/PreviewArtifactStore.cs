using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.Processing.Application.Previews;

namespace Mbb.Archive.Modules.Processing.Infrastructure.Previews;

internal sealed class PreviewArtifactOptions
{
    public const string SectionName = "Processing:Artifacts";
    public string Provider { get; init; } = "Local";
    public string LocalRootPath { get; init; } = "./.local-data/artifacts";
    public string BucketName { get; init; } = "";
    public string? ServiceUrl { get; init; }
    public string? Region { get; init; }
    public bool ForcePathStyle { get; init; } = true;
    public string? AccessKey { get; init; }
    public string? SecretKey { get; init; }
}

internal sealed class PreviewArtifactStore(IOptions<PreviewArtifactOptions> options) : IPreviewArtifactStore, IDisposable
{
    private IAmazonS3? _s3;
    public async Task<Stream?> OpenReadAsync(string key, CancellationToken ct)
    {
        var o = options.Value;
        if (o.Provider.Equals("Local", StringComparison.OrdinalIgnoreCase))
        {
            var root = Path.GetFullPath(o.LocalRootPath).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var path = Path.GetFullPath(Path.Combine(root, key));
            if (!path.StartsWith(root, StringComparison.Ordinal)) throw new InvalidOperationException("Preview artifact escapes storage root.");
            return File.Exists(path) ? new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 65536,
                FileOptions.Asynchronous | FileOptions.SequentialScan) : null;
        }
        if (!o.Provider.Equals("S3", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Unsupported preview storage provider.");
        if (_s3 is null)
        {
            var config = new AmazonS3Config { ForcePathStyle = o.ForcePathStyle };
            if (!string.IsNullOrWhiteSpace(o.ServiceUrl)) config.ServiceURL = o.ServiceUrl;
            if (!string.IsNullOrWhiteSpace(o.Region)) config.RegionEndpoint = RegionEndpoint.GetBySystemName(o.Region);
            _s3 = !string.IsNullOrWhiteSpace(o.AccessKey) && !string.IsNullOrWhiteSpace(o.SecretKey)
                ? new AmazonS3Client(new BasicAWSCredentials(o.AccessKey, o.SecretKey), config) : new AmazonS3Client(config);
        }
        try { return (await _s3.GetObjectAsync(new GetObjectRequest { BucketName = o.BucketName, Key = key }, ct)).ResponseStream; }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return null; }
    }
    public void Dispose() => _s3?.Dispose();
}
