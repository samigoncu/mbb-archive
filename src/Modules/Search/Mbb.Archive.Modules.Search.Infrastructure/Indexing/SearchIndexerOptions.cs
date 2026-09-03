namespace Mbb.Archive.Modules.Search.Infrastructure.Indexing;
internal sealed class SearchIndexerOptions{public const string SectionName="Search:Indexer";public int BatchSize{get;init;}=25;public int PollIntervalMilliseconds{get;init;}=1000;public int LeaseSeconds{get;init;}=180;public int MaxAttempts{get;init;}=10;public int MaxBackoffSeconds{get;init;}=300;}
