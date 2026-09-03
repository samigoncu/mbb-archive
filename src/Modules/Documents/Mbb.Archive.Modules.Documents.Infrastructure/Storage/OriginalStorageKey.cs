namespace Mbb.Archive.Modules.Documents.Infrastructure.Storage;

internal static class OriginalStorageKey
{
    internal static string FromSha256(string sha256Hash)
    {
        if (string.IsNullOrWhiteSpace(sha256Hash) || sha256Hash.Length != 64)
            throw new ArgumentException("SHA-256 hash must be 64 characters.", nameof(sha256Hash));

        var hash = sha256Hash.ToLowerInvariant();

        return $"originals/sha256/{hash[..2]}/{hash[2..4]}/{hash}";
    }
}
