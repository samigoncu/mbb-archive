namespace Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;

public sealed class RabbitMqOptions
{
    public const string SectionName = "RabbitMq";

    public string HostName { get; init; } = "localhost";
    public int Port { get; init; } = 5672;
    public string UserName { get; init; } = "guest";
    public string Password { get; init; } = "guest";
    public string VirtualHost { get; init; } = "/";
    public string Exchange { get; init; } = "mbb.archive.events";
    public string DeadLetterExchange { get; init; } = "mbb.archive.dlx";
    public string ClientProvidedName { get; init; } = "mbb-archive-api:outbox-publisher";
    public IReadOnlyList<RabbitMqBindingOptions> Bindings { get; init; } = [];
}

public sealed class RabbitMqBindingOptions
{
    public string Queue { get; init; } = string.Empty;
    public string RoutingKey { get; init; } = string.Empty;
    public string DeadLetterQueue { get; init; } = string.Empty;
}
