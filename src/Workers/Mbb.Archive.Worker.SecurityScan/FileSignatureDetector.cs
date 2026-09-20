using System.Buffers.Binary;
using System.IO.Compression;
using System.Text;

namespace Mbb.Archive.Worker.SecurityScan;

/// <summary>
/// İçerik tabanlı MIME tespiti. §28 gereği uzantıya güvenilmez; tür yalnızca
/// dosyanın kendi baytlarından çıkarılır.
/// </summary>
internal sealed class FileSignatureDetector
{
    private const int ProbeLength = 512;

    /// <summary>OOXML/OLE ayrıştırmasında okunacak azami giriş sayısı; hazırlanmış
    /// arşivlerin tespiti kilitlemesini engeller (§28 zip bomb sınırı).</summary>
    private const int MaxArchiveEntriesInspected = 256;

    /// <summary>Düz metin kararı için incelenecek azami bayt sayısı.</summary>
    private const int TextProbeLength = 4096;

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
            {
                stream.Position = originalPosition;
                return DetectOpenXml(stream) ?? "application/zip";
            }

            if (StartsWith(data, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]))
            {
                stream.Position = originalPosition;

                return await DetectCompoundFileAsync(stream, cancellationToken)
                    ?? "application/x-ole-storage";
            }

            // Metin tabanlı formatların sihirli baytı yoktur; karar içeriğin
            // kendisinden verilir.
            stream.Position = originalPosition;
            return await DetectTextAsync(stream, cancellationToken);
        }
        finally
        {
            stream.Position = originalPosition;
        }
    }

    /// <summary>
    /// OOXML kabı ZIP'tir. Yalnızca merkezi dizin okunur; hiçbir giriş açılmaz,
    /// dolayısıyla sıkıştırma bombası tespit sırasında açılmaz.
    /// </summary>
    private static string? DetectOpenXml(Stream stream)
    {
        try
        {
            using var archive = new ZipArchive(
                stream,
                ZipArchiveMode.Read,
                leaveOpen: true);

            var mimeEntry = archive.GetEntry("mimetype");
            if (mimeEntry is { Length: > 0 and <= 128 } && archive.GetEntry("content.xml") is not null)
            {
                using var reader = new StreamReader(mimeEntry.Open(), Encoding.ASCII);
                var odfType = reader.ReadToEnd();
                if (odfType is "application/vnd.oasis.opendocument.text"
                    or "application/vnd.oasis.opendocument.spreadsheet"
                    or "application/vnd.oasis.opendocument.presentation")
                    return odfType;
            }

            var inspected = 0;

            foreach (var entry in archive.Entries)
            {
                if (++inspected > MaxArchiveEntriesInspected)
                    break;

                var name = entry.FullName;

                if (name.StartsWith("word/", StringComparison.OrdinalIgnoreCase))
                    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

                if (name.StartsWith("xl/", StringComparison.OrdinalIgnoreCase))
                    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                if (name.StartsWith("ppt/", StringComparison.OrdinalIgnoreCase))
                    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            }

            return null;
        }
        catch (InvalidDataException)
        {
            return null;
        }
    }

    /// <summary>
    /// Eski Office formatları OLE Compound File kabındadır. Kap başlığındaki
    /// dizin sektörü okunarak akış adlarından tür çıkarılır.
    /// </summary>
    private static async Task<string?> DetectCompoundFileAsync(
        Stream stream,
        CancellationToken cancellationToken)
    {
        const int headerLength = 512;
        const int directoryEntryLength = 128;

        var header = new byte[headerLength];

        if (await ReadExactlyOrDefaultAsync(stream, header, cancellationToken) != headerLength)
            return null;

        var sectorShift = BinaryPrimitives.ReadUInt16LittleEndian(header.AsSpan(30, 2));

        if (sectorShift is not (9 or 12))
            return null;

        var sectorSize = 1 << sectorShift;

        var directorySector =
            BinaryPrimitives.ReadUInt32LittleEndian(header.AsSpan(48, 4));

        if (directorySector is 0xFFFFFFFF or 0xFFFFFFFE)
            return null;

        var directoryOffset = (long)(directorySector + 1) * sectorSize;

        if (directoryOffset < 0 || directoryOffset >= stream.Length)
            return null;

        stream.Position = directoryOffset;

        var directory = new byte[sectorSize];

        if (await ReadExactlyOrDefaultAsync(stream, directory, cancellationToken) != sectorSize)
            return null;

        for (var offset = 0; offset + directoryEntryLength <= directory.Length;
             offset += directoryEntryLength)
        {
            var nameLength =
                BinaryPrimitives.ReadUInt16LittleEndian(directory.AsSpan(offset + 64, 2));

            if (nameLength is 0 or > 64)
                continue;

            // nameLength sondaki null dahil bayt sayısıdır.
            var name = Encoding.Unicode
                .GetString(directory, offset, nameLength - 2)
                .Trim();

            switch (name)
            {
                case "WordDocument":
                    return "application/msword";

                case "Workbook":
                case "Book":
                    return "application/vnd.ms-excel";

                case "PowerPoint Document":
                    return "application/vnd.ms-powerpoint";
            }

            if (name.StartsWith("__substg1.0_", StringComparison.Ordinal) ||
                name.StartsWith("__properties_version1.0", StringComparison.Ordinal))
            {
                return "application/vnd.ms-outlook";
            }
        }

        return null;
    }

    /// <summary>
    /// Düz metin ve RFC 822 e-posta tespiti. İçerikte kontrol karakteri varsa
    /// dosya metin sayılmaz ve tür belirlenemez olarak döner.
    /// </summary>
    private static async Task<string?> DetectTextAsync(
        Stream stream,
        CancellationToken cancellationToken)
    {
        var probe = new byte[TextProbeLength];
        var read = await stream.ReadAsync(probe, cancellationToken);

        if (read == 0)
            return null;

        var content = probe.AsSpan(0, read);

        // UTF-8 BOM metin kabul edilir; kalan bayt yoksa karar verilemez.
        var start = StartsWith(content, [0xEF, 0xBB, 0xBF]) ? 3 : 0;

        if (start >= read)
            return null;

        foreach (var value in content[start..])
        {
            var isAllowedControl = value is 0x09 or 0x0A or 0x0D or 0x0C;

            if (value < 0x20 && !isAllowedControl)
                return null;
        }

        var text = Encoding.UTF8.GetString(content[start..]);

        return LooksLikeEmail(text) ? "message/rfc822" : "text/plain";
    }

    /// <summary>
    /// RFC 822 başlık bloğu arar. Yalnızca ilk satırlar incelenir; gövdedeki
    /// benzer metinler yanlış pozitif üretmez.
    /// </summary>
    private static bool LooksLikeEmail(string text)
    {
        string[] headers =
        [
            "Received:",
            "Return-Path:",
            "Message-ID:",
            "MIME-Version:",
            "From:",
            "Delivered-To:"
        ];

        var lines = text.Split('\n', 12);
        var matches = 0;

        foreach (var line in lines)
        {
            var trimmed = line.TrimEnd('\r');

            if (trimmed.Length == 0)
                break;

            if (headers.Any(x => trimmed.StartsWith(x, StringComparison.OrdinalIgnoreCase)))
                matches++;
        }

        return matches >= 2;
    }

    private static async Task<int> ReadExactlyOrDefaultAsync(
        Stream stream,
        byte[] buffer,
        CancellationToken cancellationToken)
    {
        var total = 0;

        while (total < buffer.Length)
        {
            var read = await stream.ReadAsync(
                buffer.AsMemory(total),
                cancellationToken);

            if (read == 0)
                break;

            total += read;
        }

        return total;
    }

    private static bool StartsWith(
        ReadOnlySpan<byte> data,
        ReadOnlySpan<byte> signature)
        => data.Length >= signature.Length &&
           data[..signature.Length].SequenceEqual(signature);
}
