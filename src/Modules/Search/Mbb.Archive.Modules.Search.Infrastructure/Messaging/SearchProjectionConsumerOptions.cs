namespace Mbb.Archive.Modules.Search.Infrastructure.Messaging;
internal sealed class SearchProjectionConsumerOptions{public const string SectionName="Search:Consumers:Projection";public string Queue{get;init;}="mbb.archive.search.projection.v1";public ushort PrefetchCount{get;init;}=32;}
