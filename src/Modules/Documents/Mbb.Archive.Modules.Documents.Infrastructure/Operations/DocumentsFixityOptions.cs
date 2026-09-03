namespace Mbb.Archive.Modules.Documents.Infrastructure.Operations;

internal sealed class DocumentsFixityOptions
{
    public const string SectionName = "Documents:Fixity";

    public int SampleSize { get; init; } = 25;
}
