namespace Mbb.Archive.Modules.Documents.Infrastructure.Storage;

internal sealed class FileStagingOptions
{
    public const string SectionName = "Documents:FileStaging";

    public string RootPath { get; init; } = "./.local-data/staging";
    public long MaxUploadBytes { get; init; } = 2L * 1024 * 1024 * 1024;
}
