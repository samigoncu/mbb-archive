using System.Text.Json;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Operations.Application.Models;

namespace Mbb.Archive.Modules.Operations.Infrastructure.Probes;

internal sealed class OpenSearchProbe
{
    private readonly HttpClient _httpClient;
    private readonly OperationsProbeOptions _options;

    public OpenSearchProbe(
        HttpClient httpClient,
        IOptions<OperationsProbeOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<ExternalDependencyStatus> ProbeAsync(
        CancellationToken cancellationToken)
    {
        if (!_options.OpenSearch.Enabled)
        {
            return new ExternalDependencyStatus(
                "OpenSearch",
                OperationalHealth.Unknown,
                "Probe disabled.");
        }

        try
        {
            using var response = await _httpClient.GetAsync(
                $"{_options.OpenSearch.BaseUrl.TrimEnd('/')}/_cluster/health",
                cancellationToken);

            response.EnsureSuccessStatusCode();

            await using var body = await response.Content.ReadAsStreamAsync(
                cancellationToken);

            using var document = await JsonDocument.ParseAsync(
                body,
                cancellationToken: cancellationToken);

            var statusText =
                document.RootElement.GetProperty("status").GetString()
                ?? "unknown";

            var health = statusText.ToLowerInvariant() switch
            {
                "green" => OperationalHealth.Healthy,
                "yellow" => OperationalHealth.Degraded,
                "red" => OperationalHealth.Unhealthy,
                _ => OperationalHealth.Unknown
            };

            return new ExternalDependencyStatus(
                "OpenSearch",
                health,
                $"Cluster status: {statusText}.");
        }
        catch (Exception ex)
        {
            return new ExternalDependencyStatus(
                "OpenSearch",
                OperationalHealth.Unhealthy,
                ex.Message);
        }
    }
}
