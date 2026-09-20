using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Npgsql;
using Mbb.Archive.BuildingBlocks.Application.Auditing;
using Mbb.Archive.Modules.Audit.Infrastructure;
using Mbb.Archive.Modules.Audit.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Audit.UnitTests;

[TestClass]
public sealed class AuditDisplayTests
{
    [TestMethod]
    public void Legacy_folder_path_resolves_without_changing_original_evidence()
    {
        var id = Guid.NewGuid();
        var payload = JsonSerializer.Serialize(new { actor = "subject", entityType = "request", entityId = $"/api/v1/physical-archive/folders/{id}" });
        var entry = Entry(payload);
        var item = AuditEventProjection.Project(entry);
        Assert.AreEqual("folder", item.ResourceType);
        Assert.AreEqual(id.ToString(), item.ResourceId);
        Assert.AreEqual($"/api/v1/physical-archive/folders/{id}", item.EntityId);
        Assert.AreEqual(payload, entry.Payload);
        Assert.AreEqual(entry.EntryHash, item.EntryHash);
    }

    [TestMethod]
    public void Distinguishes_dossiers_from_documents_in_legacy_paths()
    {
        var id = Guid.NewGuid();
        var item = AuditEventProjection.Project(Entry(JsonSerializer.Serialize(new {
            entityType = "request", entityId = $"/api/v1/documents/dossiers/{id}" })));
        Assert.AreEqual("dossier", item.ResourceType);
        Assert.AreEqual(id.ToString(), item.ResourceId);
    }

    [TestMethod]
    public void Integration_folder_event_keeps_resource_identity_without_inventing_actor()
    {
        var id = Guid.NewGuid();
        var item = AuditEventProjection.Project(Entry(JsonSerializer.Serialize(new { folderId = id })));
        Assert.AreEqual("folder", item.ResourceType);
        Assert.AreEqual(id.ToString(), item.ResourceId);
        Assert.IsNull(item.ActorDisplayName);
        Assert.IsNull(item.Actor);
    }

    [TestMethod]
    public async Task Resolves_names_once_and_preserves_journal_payloads()
    {
        await using var db = await CreateDatabase();
        var writer = new AuditJournalWriter(db, TimeProvider.System);
        var document = Guid.NewGuid();
        var actor = Guid.NewGuid().ToString();
        var payload = JsonSerializer.Serialize(new { actor, actorDisplayName = "Ayşe Yılmaz", entityType = "document", entityId = document, documentId = document });
        var now = DateTimeOffset.FromUnixTimeMilliseconds(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        await writer.AppendAsync(Guid.NewGuid(), "access.document-viewed.v1", payload, now, default);
        await writer.AppendAsync(Guid.NewGuid(), "access.document-downloaded.v1", payload, now, default);
        var resolver = new DisplayResolver(new("Satın Alma Yazısı", $"/documents/{document}"));
        var query = new AuditJournalQueries(db, resolver);
        var before = await db.Entries.CountAsync();
        var events = await query.ReadAsync(null, document, actor, null, null, null, 100, default, "user");
        Assert.AreEqual(2, events.Count);
        Assert.IsTrue(events.All(x => x.ActorDisplayName == "Ayşe Yılmaz" && x.ResourceName == "Satın Alma Yazısı"));
        Assert.AreEqual(1, resolver.Calls);
        Assert.AreEqual(before, await db.Entries.CountAsync());
        Assert.IsTrue(await db.Entries.Where(x => x.DocumentId == document).AllAsync(x => x.Payload == payload));
        Assert.AreEqual(0, (await query.ReadAsync(null, document, actor, null, null, null, 100, default, "system")).Count);
    }

    [TestMethod]
    public async Task Unavailable_resource_does_not_expose_title_from_event_payload()
    {
        await using var db = await CreateDatabase();
        var document = Guid.NewGuid();
        var writer = new AuditJournalWriter(db, TimeProvider.System);
        var now = DateTimeOffset.FromUnixTimeMilliseconds(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        await writer.AppendAsync(Guid.NewGuid(), "documents.created.v1", JsonSerializer.Serialize(new {
            documentId = document, title = "Diğer birimin gizli başlığı" }), now, default);
        var events = await new AuditJournalQueries(db, new DisplayResolver(null))
            .ReadAsync(null, document, null, null, null, null, 100, default);
        Assert.AreEqual(1, events.Count);
        Assert.IsNull(events[0].ResourceName);
        Assert.IsNull(events[0].ResourceUrl);
    }

    private static AuditEntry Entry(string payload) => new(1, Guid.NewGuid(), "access.resource-viewed.v1", payload,
        null, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, new string('0', 64), new string('a', 64));

    private static async Task<AuditDbContext> CreateDatabase()
    {
        var connection = Environment.GetEnvironmentVariable("MBB_ARCHIVE_TEST_POSTGRES");
        if (string.IsNullOrEmpty(connection)) Assert.Inconclusive("Set MBB_ARCHIVE_TEST_POSTGRES to an isolated test database.");
        var name = new NpgsqlConnectionStringBuilder(connection).Database;
        Assert.IsTrue(name?.StartsWith("mbb_archive_", StringComparison.Ordinal) == true && name.Contains("tests", StringComparison.Ordinal));
        var db = new AuditDbContext(new DbContextOptionsBuilder<AuditDbContext>()
            .UseNpgsql(connection, options => options.MigrationsHistoryTable("__EFMigrationsHistory_Audit", "audit")).Options);
        await db.Database.MigrateAsync();
        return db;
    }

    private sealed class DisplayResolver(AuditResourceDisplay? result) : IAuditDisplayResolver
    {
        public int Calls { get; private set; }
        public string? ResolveActorName(string actor) => null;
        public Task<AuditResourceDisplay?> ResolveResourceAsync(string type, string id, CancellationToken ct)
        { Calls++; return Task.FromResult(result); }
    }
}
