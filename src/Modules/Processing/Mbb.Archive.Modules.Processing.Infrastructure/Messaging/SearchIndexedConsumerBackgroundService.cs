using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;
using Mbb.Archive.Modules.Processing.Application.Jobs.Results;
using Mbb.Archive.Modules.Search.Contracts.IntegrationEvents;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
namespace Mbb.Archive.Modules.Processing.Infrastructure.Messaging;
internal sealed class SearchIndexedConsumerBackgroundService:BackgroundService
{
    private readonly RabbitMqConnection _rabbit;private readonly IServiceScopeFactory _scopes;private readonly SearchIndexedConsumerOptions _options;
    public SearchIndexedConsumerBackgroundService(RabbitMqConnection rabbit,IServiceScopeFactory scopes,IOptions<SearchIndexedConsumerOptions> options){_rabbit=rabbit;_scopes=scopes;_options=options.Value;}
    protected override async Task ExecuteAsync(CancellationToken ct){await using var channel=await _rabbit.CreateConsumerChannelAsync(ct);await channel.BasicQosAsync(0,_options.PrefetchCount,false,ct);var consumer=new AsyncEventingBasicConsumer(channel);consumer.ReceivedAsync+=async(_,d)=>{try{var e=JsonSerializer.Deserialize<SearchDocumentIndexedIntegrationEvent>(d.Body.ToArray(),new JsonSerializerOptions(JsonSerializerDefaults.Web))??throw new InvalidOperationException("Search-indexed event invalid.");await using var scope=_scopes.CreateAsyncScope();var h=scope.ServiceProvider.GetRequiredService<MarkSearchIndexedCommandHandler>();var result=await h.Handle(new MarkSearchIndexedCommand(e.EventId,e.EventName,e.DocumentId,e.DocumentVersionId,e.OccurredAt),ct);if(result.IsSuccess)await channel.BasicAckAsync(d.DeliveryTag,false,ct);else await channel.BasicRejectAsync(d.DeliveryTag,false,ct);}catch(OperationCanceledException)when(ct.IsCancellationRequested){throw;}catch{await Task.Delay(TimeSpan.FromSeconds(3),ct);await channel.BasicNackAsync(d.DeliveryTag,false,true,ct);}};await channel.BasicConsumeAsync(_options.Queue,false,consumer,ct);await Task.Delay(Timeout.InfiniteTimeSpan,ct);}
}
