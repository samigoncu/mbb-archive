using System.Security.Cryptography;
using System.Text;

namespace Mbb.Archive.Worker.SecurityScan;

internal static class DeterministicEventId
{
    public static Guid Create(
        Guid sourceMessageId,
        string eventKind)
    {
        var source = Encoding.UTF8.GetBytes(
            $"{sourceMessageId:D}:{eventKind}");

        var hash = SHA256.HashData(source);
        var bytes = hash.AsSpan(0, 16).ToArray();

        // Deterministic id yalnız deduplication için kullanılır.
        // Random security token veya cryptographic secret değildir.
        return new Guid(bytes);
    }
}
