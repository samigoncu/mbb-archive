namespace Mbb.Archive.Modules.Processing.Infrastructure.Messaging;
internal sealed class SearchIndexedConsumerOptions{public const string SectionName="Processing:Consumers:SearchIndexed";public string Queue{get;init;}="mbb.archive.processing.search-indexed.v1";public ushort PrefetchCount{get;init;}=16;}
