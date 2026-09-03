namespace Mbb.Archive.Modules.Operations.Infrastructure.Probes;

internal sealed class OperationsProbeOptions
{
    public const string SectionName = "Operations:Probes";

    public RabbitMqManagementOptions RabbitMq { get; init; } = new();
    public HttpDependencyOptions OpenSearch { get; init; } = new();
}

internal sealed class RabbitMqManagementOptions
{
    public string BaseUrl { get; init; } = "http://localhost:15672";
    public string UserName { get; init; } = "mbb_archive";
    public string Password { get; init; } = string.Empty;
    public string VirtualHost { get; init; } = "/";
    public bool Enabled { get; init; } = true;
}

internal sealed class HttpDependencyOptions
{
    public string BaseUrl { get; init; } = "http://localhost:9200";
    public bool Enabled { get; init; } = true;
}
