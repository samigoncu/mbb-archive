using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;
using Mbb.Archive.Modules.Classification.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Processing.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Search.Application.Projection;
using Mbb.Archive.Modules.Search.Domain.Documents;
using Mbb.Archive.Modules.Geo.Contracts.IntegrationEvents;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Mbb.Archive.Modules.Search.Infrastructure.Messaging;

internal sealed class SearchProjectionConsumerBackgroundService:BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions=new(JsonSerializerDefaults.Web);
    private readonly RabbitMqConnection _rabbit;private readonly IServiceScopeFactory _scopeFactory;private readonly SearchProjectionConsumerOptions _options;private readonly ILogger<SearchProjectionConsumerBackgroundService> _logger;
    public SearchProjectionConsumerBackgroundService(RabbitMqConnection rabbit,IServiceScopeFactory scopeFactory,IOptions<SearchProjectionConsumerOptions> options,ILogger<SearchProjectionConsumerBackgroundService> logger){_rabbit=rabbit;_scopeFactory=scopeFactory;_options=options.Value;_logger=logger;}
    protected override async Task ExecuteAsync(CancellationToken stoppingToken){await using var channel=await _rabbit.CreateConsumerChannelAsync(stoppingToken);await channel.BasicQosAsync(0,_options.PrefetchCount,false,stoppingToken);var consumer=new AsyncEventingBasicConsumer(channel);consumer.ReceivedAsync+=async(_,delivery)=>{var body=delivery.Body.ToArray();var name=delivery.BasicProperties.Type??string.Empty;try{var success=await ProcessAsync(name,body,stoppingToken);if(success)await channel.BasicAckAsync(delivery.DeliveryTag,false,stoppingToken);else await channel.BasicRejectAsync(delivery.DeliveryTag,false,stoppingToken);}catch(OperationCanceledException)when(stoppingToken.IsCancellationRequested){throw;}catch(Exception ex){_logger.LogError(ex,"Search projection event {EventName} failed.",name);await Task.Delay(TimeSpan.FromSeconds(3),stoppingToken);await channel.BasicNackAsync(delivery.DeliveryTag,false,true,stoppingToken);}};await channel.BasicConsumeAsync(_options.Queue,false,consumer,stoppingToken);await Task.Delay(Timeout.InfiniteTimeSpan,stoppingToken);}
    private async Task<bool> ProcessAsync(string name,byte[] body,CancellationToken ct){await using var scope=_scopeFactory.CreateAsyncScope();var handler=scope.ServiceProvider.GetRequiredService<SearchProjectionHandler>();return name switch{"documents.created.v1"=>await Created(handler,body,ct),"processing.ready-for-index.v1" or "documents.version-cancelled.v1"=>await CurrentVersion(handler,body,scope.ServiceProvider.GetRequiredService<Mbb.Archive.Modules.Search.Application.Abstractions.ICurrentVersionProjectionSource>(),ct),"classification.document-classified.v1"=>await Classified(handler,body,scope.ServiceProvider.GetRequiredService<Mbb.Archive.Modules.Classification.Contracts.IDocumentClassificationFiling>(),ct),"classification.document-metadata-changed.v1"=>await Metadata(handler,body,ct),"geo.document-relations-changed.v1"=>await GeoRelations(handler,body,ct),_=>false};}
    private static async Task<bool> Created(SearchProjectionHandler h,byte[] b,CancellationToken ct){var e=JsonSerializer.Deserialize<DocumentCreatedIntegrationEvent>(b,JsonOptions)??throw new InvalidOperationException("Document-created event invalid.");return(await h.Handle(new ApplyDocumentCreatedCommand(e.EventId,e.EventName,e.DocumentId,e.Title,e.OccurredAt,e.OwnerUnitPath),ct)).IsSuccess;}
    private static async Task<bool> CurrentVersion(SearchProjectionHandler handler, byte[] body,
        Mbb.Archive.Modules.Search.Application.Abstractions.ICurrentVersionProjectionSource source, CancellationToken ct)
    {
        using var payload = JsonDocument.Parse(body);
        var data = payload.RootElement;
        var id = data.GetProperty("documentId").GetGuid();
        var current = await source.GetAsync(id, ct);
        if (current is null) return false;
        return (await handler.Handle(new ApplyProcessingReadyCommand(data.GetProperty("eventId").GetGuid(),
            data.GetProperty("eventName").GetString()!, id, current.VersionId, current.TextKey, current.OcrKey,
            data.GetProperty("occurredAt").GetDateTimeOffset(), current.MimeType), ct)).IsSuccess;
    }
    private static async Task<bool> Classified(SearchProjectionHandler handler, byte[] body,
        Mbb.Archive.Modules.Classification.Contracts.IDocumentClassificationFiling classifications, CancellationToken ct)
    {
        var e = JsonSerializer.Deserialize<DocumentClassifiedIntegrationEvent>(body, JsonOptions)
            ?? throw new InvalidOperationException("Document-classified event invalid.");
        var current = e.IsPrimary ? await classifications.GetPrimaryAsync(e.DocumentId, ct) : null;
        return (await handler.Handle(new ApplyClassificationCommand(e.EventId, e.EventName, e.DocumentId,
            current?.PlanCode ?? e.FilePlanCode, current?.PlanName ?? e.FilePlanName,
            current?.Code ?? e.FilePlanItemCode, current?.Title ?? e.FilePlanItemTitle, e.IsPrimary, e.OccurredAt), ct)).IsSuccess;
    }
    private static async Task<bool> GeoRelations(SearchProjectionHandler h,byte[] b,CancellationToken ct){var e=JsonSerializer.Deserialize<DocumentGeoRelationsChangedIntegrationEvent>(b,JsonOptions)??throw new InvalidOperationException("Geo relations event invalid.");var entries=e.Relations.Select(x=>new SearchGeoRelationEntry(x.GeoEntityId,x.Name,x.EntityType,x.LayerName,x.RelationType)).ToArray();return(await h.Handle(new ApplyGeoRelationsCommand(e.EventId,e.EventName,e.DocumentId,entries,e.OccurredAt),ct)).IsSuccess;}
    private static async Task<bool> Metadata(SearchProjectionHandler h,byte[] b,CancellationToken ct){var e=JsonSerializer.Deserialize<DocumentMetadataChangedIntegrationEvent>(b,JsonOptions)??throw new InvalidOperationException("Metadata event invalid.");return(await h.Handle(new ApplyMetadataCommand(e.EventId,e.EventName,e.DocumentId,e.SchemaKey,e.SchemaName,e.SchemaVersion,e.ValuesJson,e.OccurredAt),ct)).IsSuccess;}
}
