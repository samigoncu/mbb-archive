using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;

namespace Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;

/// <summary>
/// RabbitMQ connection/channel yaşam döngüsünü tek yerde yönetir.
/// Connection ve channel uzun ömürlüdür. Channel eşzamanlı publish için paylaşılmadığından
/// operasyonlar tek bir gate üzerinden seri hale getirilir.
/// </summary>
public sealed class RabbitMqConnection : IAsyncDisposable
{
    private readonly RabbitMqOptions _options;
    private readonly ILogger<RabbitMqConnection> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);

    private IConnection? _connection;
    private IChannel? _channel;

    public RabbitMqConnection(
        IOptions<RabbitMqOptions> options,
        ILogger<RabbitMqConnection> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task ExecuteWithPublisherChannelAsync(
        Func<IChannel, CancellationToken, Task> operation,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(operation);

        await _gate.WaitAsync(cancellationToken);

        try
        {
            var channel = await EnsurePublisherChannelAsync(cancellationToken);
            await operation(channel, cancellationToken);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<IChannel> CreateConsumerChannelAsync(
        CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            await EnsureConnectionAsync(cancellationToken);

            var channel = await _connection!.CreateChannelAsync(
                cancellationToken: cancellationToken);

            await DeclareTopologyAsync(channel, cancellationToken);
            return channel;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<IChannel> EnsurePublisherChannelAsync(
        CancellationToken cancellationToken)
    {
        if (_channel is { IsOpen: true })
            return _channel;

        await DisposeChannelAsync();
        await EnsureConnectionAsync(cancellationToken);

        var channelOptions = new CreateChannelOptions(
            publisherConfirmationsEnabled: true,
            publisherConfirmationTrackingEnabled: true);

        _channel = await _connection!.CreateChannelAsync(
            channelOptions,
            cancellationToken);

        await DeclareTopologyAsync(_channel, cancellationToken);

        return _channel;
    }

    private async Task EnsureConnectionAsync(
        CancellationToken cancellationToken)
    {
        if (_connection is { IsOpen: true })
            return;

        await DisposeConnectionAsync();

        var factory = new ConnectionFactory
        {
            HostName = _options.HostName,
            Port = _options.Port,
            UserName = _options.UserName,
            Password = _options.Password,
            VirtualHost = _options.VirtualHost,
            AutomaticRecoveryEnabled = true,
            TopologyRecoveryEnabled = true,
            ClientProvidedName = _options.ClientProvidedName
        };

        _logger.LogInformation(
            "Connecting to RabbitMQ at {Host}:{Port}, vhost {VirtualHost}.",
            _options.HostName,
            _options.Port,
            _options.VirtualHost);

        _connection = await factory.CreateConnectionAsync(cancellationToken);
    }

    private async Task DeclareTopologyAsync(
        IChannel channel,
        CancellationToken cancellationToken)
    {
        await channel.ExchangeDeclareAsync(
            exchange: _options.Exchange,
            type: ExchangeType.Topic,
            durable: true,
            autoDelete: false,
            arguments: null,
            cancellationToken: cancellationToken);

        await channel.ExchangeDeclareAsync(
            exchange: _options.DeadLetterExchange,
            type: ExchangeType.Topic,
            durable: true,
            autoDelete: false,
            arguments: null,
            cancellationToken: cancellationToken);

        foreach (var binding in _options.Bindings)
        {
            ValidateBinding(binding);

            var queueArguments = new Dictionary<string, object?>
            {
                ["x-dead-letter-exchange"] = _options.DeadLetterExchange,
                // Bir kuyruk birden fazla routing key ile bind edilebildiği için
                // dead-letter routing key kuyruk başına sabit olmalıdır; routing key'den
                // türetilirse ikinci declare 406 PRECONDITION_FAILED ile reddedilir.
                ["x-dead-letter-routing-key"] = binding.DeadLetterQueue
            };

            await channel.QueueDeclareAsync(
                queue: binding.Queue,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: queueArguments,
                cancellationToken: cancellationToken);

            await channel.QueueBindAsync(
                queue: binding.Queue,
                exchange: _options.Exchange,
                routingKey: binding.RoutingKey,
                arguments: null,
                cancellationToken: cancellationToken);

            await channel.QueueDeclareAsync(
                queue: binding.DeadLetterQueue,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null,
                cancellationToken: cancellationToken);

            await channel.QueueBindAsync(
                queue: binding.DeadLetterQueue,
                exchange: _options.DeadLetterExchange,
                routingKey: binding.DeadLetterQueue,
                arguments: null,
                cancellationToken: cancellationToken);
        }
    }

    private static void ValidateBinding(RabbitMqBindingOptions binding)
    {
        if (string.IsNullOrWhiteSpace(binding.Queue))
            throw new InvalidOperationException("RabbitMQ binding queue is required.");

        if (string.IsNullOrWhiteSpace(binding.RoutingKey))
            throw new InvalidOperationException("RabbitMQ binding routing key is required.");

        if (string.IsNullOrWhiteSpace(binding.DeadLetterQueue))
            throw new InvalidOperationException("RabbitMQ dead-letter queue is required.");
    }

    private async Task DisposeChannelAsync()
    {
        if (_channel is null)
            return;

        try
        {
            if (_channel.IsOpen)
                await _channel.CloseAsync();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "RabbitMQ channel close failed during cleanup.");
        }

        await _channel.DisposeAsync();
        _channel = null;
    }

    private async Task DisposeConnectionAsync()
    {
        if (_connection is null)
            return;

        try
        {
            if (_connection.IsOpen)
                await _connection.CloseAsync();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "RabbitMQ connection close failed during cleanup.");
        }

        await _connection.DisposeAsync();
        _connection = null;
    }

    public async ValueTask DisposeAsync()
    {
        await _gate.WaitAsync();

        try
        {
            await DisposeChannelAsync();
            await DisposeConnectionAsync();
        }
        finally
        {
            _gate.Release();
            _gate.Dispose();
        }
    }
}
