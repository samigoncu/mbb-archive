using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Search.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence.Indexing;

namespace Mbb.Archive.Modules.Search.Infrastructure.Indexing;

internal sealed class SearchIndexerBackgroundService:BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;private readonly OpenSearchHttpClient _openSearch;private readonly SearchIndexDocumentFactory _factory;private readonly SearchIndexerOptions _options;private readonly TimeProvider _time;private readonly ILogger<SearchIndexerBackgroundService> _logger;private readonly string _workerId;
    public SearchIndexerBackgroundService(IServiceScopeFactory scopeFactory,OpenSearchHttpClient openSearch,SearchIndexDocumentFactory factory,IOptions<SearchIndexerOptions> options,TimeProvider time,ILogger<SearchIndexerBackgroundService> logger){_scopeFactory=scopeFactory;_openSearch=openSearch;_factory=factory;_options=options.Value;_time=time;_logger=logger;_workerId=$"{Environment.MachineName}:{Environment.ProcessId}:search-indexer:{Guid.CreateVersion7():N}";}
    protected override async Task ExecuteAsync(CancellationToken stoppingToken){while(!stoppingToken.IsCancellationRequested){try{var ids=await ClaimAsync(stoppingToken);foreach(var id in ids)await IndexOneAsync(id,stoppingToken);if(ids.Count==0)await Delay(stoppingToken);}catch(OperationCanceledException)when(stoppingToken.IsCancellationRequested){break;}catch(Exception ex){_logger.LogError(ex,"Search indexer loop failed.");await Delay(stoppingToken);}}}
    private async Task<IReadOnlyList<Guid>> ClaimAsync(CancellationToken ct){await using var scope=_scopeFactory.CreateAsyncScope();var db=scope.ServiceProvider.GetRequiredService<SearchDbContext>();var now=_time.GetUtcNow();await using var tx=await db.Database.BeginTransactionAsync(ct);var requests=await db.IndexRequests.FromSqlInterpolated($"""SELECT * FROM search.index_requests WHERE indexed_at IS NULL AND dead_lettered_at IS NULL AND next_attempt_at <= {now} AND (locked_until IS NULL OR locked_until < {now}) ORDER BY requested_at LIMIT {_options.BatchSize} FOR UPDATE SKIP LOCKED""").ToListAsync(ct);var until=now.AddSeconds(_options.LeaseSeconds);foreach(var r in requests)r.Lease(_workerId,until);await db.SaveChangesAsync(ct);await tx.CommitAsync(ct);return requests.Select(x=>x.DocumentId).ToArray();}
    private async Task IndexOneAsync(Guid documentId,CancellationToken ct){try{await using var scope=_scopeFactory.CreateAsyncScope();var db=scope.ServiceProvider.GetRequiredService<SearchDbContext>();var request=await db.IndexRequests.SingleAsync(x=>x.DocumentId==documentId,ct);var document=await db.Documents.AsNoTracking().SingleAsync(x=>x.Id==documentId,ct);var indexDocument=await _factory.CreateAsync(document,ct);await _openSearch.IndexAsync(indexDocument,ct);var now=_time.GetUtcNow();request.MarkIndexed(_workerId,now);db.Enqueue(new SearchDocumentIndexedIntegrationEvent(Guid.CreateVersion7(),document.Id,document.DocumentVersionId,document.Revision,now));await db.SaveChangesAsync(ct);}catch(Exception ex){_logger.LogWarning(ex,"Indexing document {DocumentId} failed.",documentId);await MarkFailedAsync(documentId,ex.Message,ct);}}
    private async Task MarkFailedAsync(Guid documentId,string error,CancellationToken ct){await using var scope=_scopeFactory.CreateAsyncScope();var db=scope.ServiceProvider.GetRequiredService<SearchDbContext>();var request=await db.IndexRequests.SingleAsync(x=>x.DocumentId==documentId,ct);var now=_time.GetUtcNow();var seconds=Math.Min(Math.Pow(2,Math.Min(request.AttemptCount+1,20)),_options.MaxBackoffSeconds);request.MarkFailed(_workerId,error,now,now.AddSeconds(seconds),_options.MaxAttempts);await db.SaveChangesAsync(ct);}
    private Task Delay(CancellationToken ct)=>Task.Delay(TimeSpan.FromMilliseconds(_options.PollIntervalMilliseconds),ct);
}
