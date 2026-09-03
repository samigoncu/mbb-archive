namespace Mbb.Archive.Worker.SecurityScan;

internal sealed class FileSignatureDetector
{
    private const int ProbeLength = 64;

    public async Task<string?> DetectAsync(
        Stream stream,
        CancellationToken cancellationToken)
    {
        if (!stream.CanSeek)
            throw new InvalidOperationException("Signature detection requires a seekable stream.");

        var buffer = new byte[ProbeLength];
        var originalPosition = stream.Position;

        try
        {
            var read = await stream.ReadAsync(buffer, cancellationToken);
            var data = buffer.AsSpan(0, read);

            if (StartsWith(data, "%PDF-"u8))
                return "application/pdf";

            if (StartsWith(data, [0xFF, 0xD8, 0xFF]))
                return "image/jpeg";

            if (StartsWith(data, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
                return "image/png";

            if (StartsWith(data, [0x49, 0x49, 0x2A, 0x00]) ||
                StartsWith(data, [0x4D, 0x4D, 0x00, 0x2A]))
            {
                return "image/tiff";
            }

            if (StartsWith(data, [0x50, 0x4B, 0x03, 0x04]))
                return "application/zip";

            if (StartsWith(data, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]))
                return "application/x-ole-storage";

            return null;
        }
        finally
        {
            stream.Position = originalPosition;
        }
    }

    private static bool StartsWith(
        ReadOnlySpan<byte> data,
        ReadOnlySpan<byte> signature)
        => data.Length >= signature.Length &&
           data[..signature.Length].SequenceEqual(signature);
}
