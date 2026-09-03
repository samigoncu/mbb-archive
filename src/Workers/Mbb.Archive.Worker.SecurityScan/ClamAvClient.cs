using System.Buffers;
using System.Buffers.Binary;
using System.Net.Sockets;
using System.Text;
using Microsoft.Extensions.Options;

namespace Mbb.Archive.Worker.SecurityScan;

internal sealed class ClamAvClient
{
    private const int ChunkSize = 1024 * 1024;

    private readonly SecurityScanOptions _options;

    public ClamAvClient(IOptions<SecurityScanOptions> options)
    {
        _options = options.Value;
    }

    public async Task<ClamAvScanResult> ScanAsync(
        Stream source,
        CancellationToken cancellationToken)
    {
        using var timeoutSource =
            CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        timeoutSource.CancelAfter(
            TimeSpan.FromSeconds(_options.ClamAvTimeoutSeconds));

        using var client = new TcpClient();

        await client.ConnectAsync(
            _options.ClamAvHost,
            _options.ClamAvPort,
            timeoutSource.Token);

        await using var network = client.GetStream();

        await network.WriteAsync(
            "zINSTREAM\0"u8.ToArray(),
            timeoutSource.Token);

        var buffer = ArrayPool<byte>.Shared.Rent(ChunkSize);
        var prefix = new byte[4];

        try
        {
            while (true)
            {
                var read = await source.ReadAsync(
                    buffer.AsMemory(0, ChunkSize),
                    timeoutSource.Token);

                if (read == 0)
                    break;

                BinaryPrimitives.WriteUInt32BigEndian(
                    prefix,
                    checked((uint)read));

                await network.WriteAsync(
                    prefix,
                    timeoutSource.Token);

                await network.WriteAsync(
                    buffer.AsMemory(0, read),
                    timeoutSource.Token);
            }

            await network.WriteAsync(
                new byte[4],
                timeoutSource.Token);

            var responseBuffer = new byte[4096];
            var responseLength = await network.ReadAsync(
                responseBuffer,
                timeoutSource.Token);

            var response = Encoding.UTF8
                .GetString(responseBuffer, 0, responseLength)
                .TrimEnd('\0', '\r', '\n');

            return ClamAvScanResult.Parse(response);
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);

            if (source.CanSeek)
                source.Position = 0;
        }
    }
}

internal sealed record ClamAvScanResult(
    bool IsClean,
    string? ThreatName,
    string RawResponse)
{
    internal static ClamAvScanResult Parse(string response)
    {
        if (response.EndsWith("OK", StringComparison.Ordinal))
            return new(true, null, response);

        const string foundSuffix = " FOUND";

        if (response.EndsWith(foundSuffix, StringComparison.Ordinal))
        {
            var separator = response.IndexOf(": ", StringComparison.Ordinal);

            var threat =
                separator >= 0
                    ? response[(separator + 2)..^foundSuffix.Length]
                    : "unknown";

            return new(false, threat, response);
        }

        throw new InvalidOperationException(
            $"Unexpected ClamAV response: '{response}'.");
    }
}
