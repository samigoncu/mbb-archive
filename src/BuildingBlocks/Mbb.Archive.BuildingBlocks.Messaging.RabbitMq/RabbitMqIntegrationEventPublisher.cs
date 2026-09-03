using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Observability;
using RabbitMQ.Client;

namespace Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;

internal sealed class RabbitMqIntegrationEventPublisher
    : IIntegrationEventPublisher
{
    private readonly RabbitMqConnection _connection;
    private readonly RabbitMqOptions _options;
    private readonly ILogger<RabbitMqIntegrationEventPublisher> _logger;

    public RabbitMqIntegrationEventPublisher(
        RabbitMqConnection connection,
        IOptions<RabbitMqOptions> options,
        ILogger<RabbitMqIntegrationEventPublisher> logger)
    {
        _connection = connection;
        _options = options.Value;
        _logger = logger;
    }

    public Task PublishAsync(
        Guid messageId,
        string eventName,
        string payload,
        DateTimeOffset occurredAt,
        CancellationToken cancellationToken)
        => _connection.ExecuteWithPublisherChannelAsync(
            async (channel, token) =>
            {
                var properties = new BasicProperties
                {
                    Persistent = true,
                    ContentType = "application/json",
                    ContentEncoding = "utf-8",
                    MessageId = messageId.ToString("D"),
                    Type = eventName,
                    Timestamp = new AmqpTimestamp(occurredAt.ToUnixTimeSeconds())
                };

                var body = Encoding.UTF8.GetBytes(payload);

                // Publisher confirms açık olduğu için await broker ack/nack sonucunu gözlemler.
                // mandatory=true ile route edilemeyen event sessizce kaybolmaz.
                await channel.BasicPublishAsync(
                    exchange: _options.Exchange,
                    routingKey: eventName,
                    mandatory: true,
                    basicProperties: properties,
                    body: body,
                    cancellationToken: token);

                _logger.LogDebug(
                    "Published integration event {EventName} with message id {MessageId}.",
                    eventName,
                    messageId);

                ArchiveTelemetry.IntegrationEventsPublished.Add(
                    1,
                    new KeyValuePair<string, object?>("event.name", eventName));
            },
            cancellationToken);
}
