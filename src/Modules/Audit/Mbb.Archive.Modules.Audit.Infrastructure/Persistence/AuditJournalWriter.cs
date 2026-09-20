using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
namespace Mbb.Archive.Modules.Audit.Infrastructure.Persistence;
internal sealed class AuditJournalWriter(AuditDbContext db, TimeProvider time)
{
    public async Task AppendAsync(Guid messageId, string eventName, string payload, DateTimeOffset occurred, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // The same lock serializes broker events and synchronous access records.
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(824601001)", ct);
        if (await db.Entries.AnyAsync(x => x.MessageId == messageId, ct)) return;
        var previous = await db.Entries.OrderByDescending(x => x.Sequence)
            .Select(x => new { x.Sequence, x.EntryHash }).FirstOrDefaultAsync(ct);
        var previousHash = previous?.EntryHash ?? new string('0', 64);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(
            $"{previousHash}|{messageId:D}|{eventName}|{occurred:O}|{payload}"))).ToLowerInvariant();
        using var json = JsonDocument.Parse(payload);
        Guid? documentId = json.RootElement.TryGetProperty("documentId", out var id)
            && id.ValueKind == JsonValueKind.String && Guid.TryParse(id.GetString(), out var parsed) ? parsed : null;
        db.Entries.Add(new AuditEntry((previous?.Sequence ?? 0) + 1, messageId, eventName,
            payload, documentId, occurred, time.GetUtcNow(), previousHash, hash));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
