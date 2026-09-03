namespace Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;
internal sealed class OpenSearchOptions
{
    public const string SectionName="Search:OpenSearch";
    public string BaseUrl{get;init;}="http://localhost:9200";
    public string IndexName{get;init;}="mbb-archive-documents-v1";
    public string? UserName{get;init;}
    public string? Password{get;init;}
}
