namespace Mbb.Archive.Modules.Evidence.Infrastructure.Timestamp;

internal sealed class TimestampAuthorityOptions
{
    public const string SectionName = "Evidence:TimestampAuthority";

    public string Url { get; init; } = string.Empty;
    public string HashAlgorithm { get; init; } = "SHA256";
    public int TimeoutSeconds { get; init; } = 30;
}
