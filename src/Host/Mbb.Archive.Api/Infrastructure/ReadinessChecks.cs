using Microsoft.Extensions.Diagnostics.HealthChecks;
using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;

namespace Mbb.Archive.Api.Infrastructure;

/// <summary>
/// §26 hazır olma denetimleri. Documents modülü kendi PostgreSQL denetimini
/// kaydeder; buradakiler o kapsamın dışında kalan bağımlılıkları doğrular.
/// Aksi halde readiness ucu bunlar düştüğünde bile sağlıklı raporlar.
/// </summary>
internal sealed class RabbitMqReadinessCheck : IHealthCheck
{
    private readonly RabbitMqConnection _connection;

    public RabbitMqReadinessCheck(RabbitMqConnection connection)
        => _connection = connection;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var channel =
                await _connection.CreateConsumerChannelAsync(cancellationToken);

            return channel.IsOpen
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("RabbitMQ channel could not be opened.");
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Unhealthy(
                "RabbitMQ connection failed.",
                exception);
        }
    }
}

/// <summary>
/// OpenSearch okuma modelidir; erişilemediğinde arama bozulur ama yazma
/// yolu çalışmaya devam eder. Bu yüzden Degraded raporlanır.
/// </summary>
internal sealed class OpenSearchReadinessCheck : IHealthCheck
{
    private readonly IHttpClientFactory _clients;
    private readonly IConfiguration _configuration;

    public OpenSearchReadinessCheck(
        IHttpClientFactory clients,
        IConfiguration configuration)
    {
        _clients = clients;
        _configuration = configuration;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var endpoint = _configuration["Search:OpenSearch:BaseUrl"];

        if (string.IsNullOrWhiteSpace(endpoint))
        {
            return HealthCheckResult.Degraded(
                "Search:OpenSearch:BaseUrl is not configured.");
        }

        try
        {
            using var client = _clients.CreateClient("readiness");
            client.Timeout = TimeSpan.FromSeconds(5);

            using var response = await client.GetAsync(
                new Uri(new Uri(endpoint), "_cluster/health"),
                cancellationToken);

            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Degraded(
                    $"OpenSearch returned {(int)response.StatusCode}.");
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Degraded(
                "OpenSearch is not reachable; search results may be stale.",
                exception);
        }
    }
}

/// <summary>
/// Orijinal nesne deposunun yazılabilirliğini doğrular. Yerel sağlayıcıda
/// kök dizinin, S3'te ise yapılandırmanın varlığı kontrol edilir.
/// </summary>
internal sealed class ObjectStorageReadinessCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;

    public ObjectStorageReadinessCheck(IConfiguration configuration)
        => _configuration = configuration;

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var section = _configuration.GetSection("Documents:OriginalStorage");
        var provider = section["Provider"];

        if (string.Equals(provider, "Local", StringComparison.OrdinalIgnoreCase))
        {
            var root = section["LocalRootPath"];

            if (string.IsNullOrWhiteSpace(root))
            {
                return Task.FromResult(
                    HealthCheckResult.Unhealthy(
                        "Documents:OriginalStorage:LocalRootPath is not configured."));
            }

            var full = Path.GetFullPath(root);

            return Task.FromResult(
                Directory.Exists(full)
                    ? HealthCheckResult.Healthy()
                    : HealthCheckResult.Unhealthy(
                        $"Original storage root does not exist: {full}"));
        }

        var bucket = section["S3:BucketName"];

        return Task.FromResult(
            string.IsNullOrWhiteSpace(bucket)
                ? HealthCheckResult.Unhealthy(
                    "Documents:OriginalStorage:S3:BucketName is not configured.")
                : HealthCheckResult.Healthy());
    }
}
