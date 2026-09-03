using System.IO.Packaging;
using Mbb.Archive.Modules.OfficialCorrespondence.Application.Abstractions;
using Mbb.Archive.Modules.OfficialCorrespondence.Domain.Eyp;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure.Eyp;

/// <summary>
/// Validates OPC container safety/structure only. This is not an EYP 2.1
/// conformance validator and intentionally does not infer official compliance.
/// </summary>
internal sealed class OpcEypStructuralInspector : IEypStructuralInspector
{
    private const int MaxParts = 5000;
    private const long MaxPartBytes = 256L * 1024 * 1024;
    private const long MaxTotalBytes = 1024L * 1024 * 1024;

    public async Task<EypStructuralInspectionResult> InspectAsync(
        Stream content,
        CancellationToken cancellationToken)
    {
        var findings = new List<string>();
        var contentTypes = new Dictionary<string, int>(
            StringComparer.OrdinalIgnoreCase);

        var partCount = 0;
        var relationshipCount = 0;
        long totalBytes = 0;

        try
        {
            using var package = Package.Open(
                content,
                FileMode.Open,
                FileAccess.Read);

            relationshipCount += package
                .GetRelationships()
                .Cast<PackageRelationship>()
                .Count();

            foreach (var part in package.GetParts())
            {
                cancellationToken.ThrowIfCancellationRequested();

                partCount++;

                if (partCount > MaxParts)
                    throw new InvalidDataException("OPC package exceeds the maximum part count.");

                contentTypes.TryGetValue(part.ContentType, out var typeCount);
                contentTypes[part.ContentType] = typeCount + 1;

                relationshipCount += part
                    .GetRelationships()
                    .Cast<PackageRelationship>()
                    .Count();

                await using var partStream = part.GetStream(
                    FileMode.Open,
                    FileAccess.Read);

                var partBytes = await CountBytesAsync(
                    partStream,
                    MaxPartBytes,
                    cancellationToken);

                totalBytes += partBytes;

                if (totalBytes > MaxTotalBytes)
                {
                    throw new InvalidDataException(
                        "OPC package exceeds the maximum uncompressed size.");
                }
            }

            findings.Add(
                "OPC container opened successfully. EYP semantic conformance still requires the official EYP 2.1 validator/API.");

            return new EypStructuralInspectionResult(
                EypStructuralStatus.ValidOpc,
                partCount,
                relationshipCount,
                totalBytes,
                contentTypes,
                findings);
        }
        catch (Exception ex) when (
            ex is IOException
            or InvalidDataException
            or FileFormatException)
        {
            findings.Add(ex.Message);

            return new EypStructuralInspectionResult(
                EypStructuralStatus.Invalid,
                partCount,
                relationshipCount,
                totalBytes,
                contentTypes,
                findings);
        }
    }

    private static async Task<long> CountBytesAsync(
        Stream stream,
        long limit,
        CancellationToken cancellationToken)
    {
        var buffer = new byte[1024 * 1024];
        long total = 0;

        while (true)
        {
            var read = await stream.ReadAsync(buffer, cancellationToken);

            if (read == 0)
                return total;

            total += read;

            if (total > limit)
                throw new InvalidDataException("OPC part exceeds the maximum uncompressed size.");
        }
    }
}
