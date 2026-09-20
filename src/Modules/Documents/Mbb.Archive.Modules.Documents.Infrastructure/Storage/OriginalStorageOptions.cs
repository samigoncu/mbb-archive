namespace Mbb.Archive.Modules.Documents.Infrastructure.Storage;

internal sealed class OriginalStorageOptions
{
    public const string SectionName = "Documents:OriginalStorage";

    public string Provider { get; init; } = "Local";
    public string LocalRootPath { get; init; } = "./.local-data/originals";

    public S3Options S3 { get; init; } = new();

    /// <summary>§3.1 WORM davranışı. Arşiv nesnesi yazıldıktan sonra
    /// değiştirilemez ve saklama süresi dolmadan silinemez hale getirilir.</summary>
    public WormOptions Worm { get; init; } = new();

    internal sealed class WormOptions
    {
        /// <summary>Kapalıyken davranış eskisiyle aynıdır; hiçbir kilit uygulanmaz.</summary>
        public bool Enabled { get; init; }

        /// <summary>S3 Object Lock kipi: Governance veya Compliance.</summary>
        public string Mode { get; init; } = "Governance";

        /// <summary>Nesnenin silinemez kalacağı gün sayısı.</summary>
        public int RetentionDays { get; init; } = 3650;
    }

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
