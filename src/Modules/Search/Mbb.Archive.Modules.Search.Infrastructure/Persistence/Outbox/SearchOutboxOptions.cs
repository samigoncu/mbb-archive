namespace Mbb.Archive.Modules.Search.Infrastructure.Persistence.Outbox;
internal sealed class SearchOutboxOptions{public const string SectionName="Search:Outbox";public int BatchSize{get;init;}=50;public int PollIntervalMilliseconds{get;init;}=1000;public int LeaseSeconds{get;init;}=120;public int MaxAttempts{get;init;}=10;public int MaxBackoffSeconds{get;init;}=300;}
