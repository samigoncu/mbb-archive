using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Operations.Application.Models;

namespace Mbb.Archive.Modules.Operations.Infrastructure.Probes;

internal sealed class RabbitMqManagementProbe
{
    private readonly HttpClient _httpClient;
    private readonly OperationsProbeOptions _options;

    public RabbitMqManagementProbe(
        HttpClient httpClient,
        IOptions<OperationsProbeOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<(ExternalDependencyStatus Status, IReadOnlyList<QueueStatus> Queues)>
        ProbeAsync(CancellationToken cancellationToken)
    {
        if (!_options.RabbitMq.Enabled)
        {
            return (
                new ExternalDependencyStatus(
                    "RabbitMQ Management",
                    OperationalHealth.Unknown,
                    "Probe disabled."),
                []);
        }

        try
        {
            var auth = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(
                    $"{_options.RabbitMq.UserName}:{_options.RabbitMq.Password}"));

            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"{_options.RabbitMq.BaseUrl.TrimEnd('/')}/api/queues/{Uri.EscapeDataString(_options.RabbitMq.VirtualHost)}");

            request.Headers.Authorization =
                new AuthenticationHeaderValue("Basic", auth);

            using var response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            response.EnsureSuccessStatusCode();

            await using var body = await response.Content.ReadAsStreamAsync(
                cancellationToken);

            using var document = await JsonDocument.ParseAsync(
                body,
                cancellationToken: cancellationToken);

            var queues = new List<QueueStatus>();

            foreach (var item in document.RootElement.EnumerateArray())
            {
                var name = item.GetProperty("name").GetString() ?? "unknown";
                var ready = ReadLong(item, "messages_ready");
                var unacked = ReadLong(item, "messages_unacknowledged");
                var total = ReadLong(item, "messages");
                var consumers = (int)ReadLong(item, "consumers");

                queues.Add(
                    new QueueStatus(
                        name,
                        ready,
                        unacked,
                        total,
                        consumers,
                        name.EndsWith(".dead", StringComparison.OrdinalIgnoreCase)));
            }

            var dead = queues
                .Where(x => x.IsDeadLetterQueue)
                .Sum(x => x.Total);

            var status = dead > 0
                ? OperationalHealth.Degraded
                : OperationalHealth.Healthy;

            return (
                new ExternalDependencyStatus(
                    "RabbitMQ Management",
                    status,
                    $"{queues.Count} queues; {dead} dead-letter messages."),
                queues.OrderByDescending(x => x.Total).ToList());
        }
        catch (Exception ex)
        {
            return (
                new ExternalDependencyStatus(
                    "RabbitMQ Management",
                    OperationalHealth.Unhealthy,
                    ex.Message),
                []);
        }
    }

    private static long ReadLong(
        JsonElement element,
        string propertyName)
        => element.TryGetProperty(propertyName, out var value)
            && value.TryGetInt64(out var parsed)
                ? parsed
                : 0;
}
