using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;
using Mbb.Archive.Modules.Classification.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Mbb.Archive.Modules.Documents.Infrastructure.Messaging;

/// <summary>
/// Birincil sınıflandırmayı belgeye yansıtır. Dosya planı dalı üzerinden
/// verilen paylaşımların SQL süzgecinde çalışabilmesi için kod belgede
/// denormalize tutulur; Documents modülü Classification tablolarına bağlanmaz.
/// </summary>
internal sealed class ClassificationConsumerBackgroundService : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly RabbitMqConnection _rabbitMq;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ClassificationConsumerOptions _options;
    private readonly ILogger<ClassificationConsumerBackgroundService> _logger;

    public ClassificationConsumerBackgroundService(
        RabbitMqConnection rabbitMq,
        IServiceScopeFactory scopeFactory,
        IOptions<ClassificationConsumerOptions> options,
        ILogger<ClassificationConsumerBackgroundService> logger)
    {
        _rabbitMq = rabbitMq;
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await using var channel = await _rabbitMq.CreateConsumerChannelAsync(stoppingToken);
        await channel.BasicQosAsync(0, _options.PrefetchCount, false, stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);

        consumer.ReceivedAsync += async (_, delivery) =>
        {
            var body = delivery.Body.ToArray();

            try
            {
                await ApplyAsync(body, stoppingToken);
                await channel.BasicAckAsync(delivery.DeliveryTag, false, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Document classification projection failed.");
                await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
                await channel.BasicNackAsync(delivery.DeliveryTag, false, true, stoppingToken);
            }
        };

        await channel.BasicConsumeAsync(_options.Queue, false, consumer, stoppingToken);
        await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
    }

    private async Task ApplyAsync(byte[] body, CancellationToken cancellationToken)
    {
        var message = JsonSerializer.Deserialize<DocumentClassifiedIntegrationEvent>(body, JsonOptions)
            ?? throw new InvalidOperationException("Document-classified event is invalid.");

        // Yalnız birincil sınıflandırma belgeye yazılır; ikincil sınıflandırma
        // kapsam kararında kullanılmaz.
        if (!message.IsPrimary)
            return;

        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<DocumentsDbContext>();

        var document = await db.Documents.SingleOrDefaultAsync(
            x => x.Id == new DocumentId(message.DocumentId),
            cancellationToken);

        if (document is null)
            return;

        // A delayed old event must not restore the pre-move SDP code.
        var current = await scope.ServiceProvider.GetRequiredService<Mbb.Archive.Modules.Classification.Contracts.IDocumentClassificationFiling>()
            .GetPrimaryAsync(message.DocumentId, cancellationToken);
        if (current is null) return;
        document.SetFilePlanCode(current.Code);
        await db.SaveChangesAsync(cancellationToken);
    }
}
