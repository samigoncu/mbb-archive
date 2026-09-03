namespace Mbb.Archive.Modules.Documents.Infrastructure.Storage;

internal sealed class OriginalStorageOptions
{
    public const string SectionName = "Documents:OriginalStorage";

    public string Provider { get; init; } = "Local";
    public string LocalRootPath { get; init; } = "./.local-data/originals";

    public S3Options S3 { get; init; } = new();

    internal sealed class S3Options
    {
        public string BucketName { get; init; } = string.Empty;
        public string? ServiceUrl { get; init; }
        public string? Region { get; init; }
        public bool ForcePathStyle { get; init; } = true;
        public string? AccessKey { get; init; }
        public string? SecretKey { get; init; }
    }
}
