namespace Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;
internal sealed record OpenSearchIndexDocument(Guid DocumentId,Guid? DocumentVersionId,string Title,string? MimeType,string Body,IReadOnlyList<OpenSearchPage> Pages,IReadOnlyList<string> FilePlanCodes,IReadOnlyList<string> FilePlanTitles,IReadOnlyList<OpenSearchMetadataEntry> MetadataEntries,string? TextArtifactStorageKey,string? OcrJsonArtifactStorageKey,long ProjectionRevision,DateTimeOffset UpdatedAt);
internal sealed record OpenSearchPage(int PageNumber,string Text);
internal sealed record OpenSearchMetadataEntry(string Key,string ValueKeyword,string ValueText);
