using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Npgsql;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Organization.Domain.Units;
using Mbb.Archive.Modules.Organization.Application.Directory;
using Mbb.Archive.Modules.Organization.Infrastructure.Directory;
using Mbb.Archive.Modules.Organization.Infrastructure.Persistence;
namespace Mbb.Archive.Modules.Organization.UnitTests;
[TestClass, DoNotParallelize]
public sealed class DirectoryPersistenceTests
{
    [TestMethod, TestCategory("PostgreSQL")]
    public async Task ReconciliationPersistsOnlyDirectoryRevocationsAndRecordsActorAndOutcome()
    {
        await WithDatabase(async connection =>
        {
            await using var db = Context(connection); var now = DateTimeOffset.UtcNow;
            var old = OrganizationUnit.CreateRoot("OLD", "Old", null, null, now); var next = OrganizationUnit.CreateRoot("NEW", "New", null, null, now);
            var manual = OrganizationUnit.CreateRoot("MANUAL", "Manual", null, null, now);
            db.Units.AddRange(old, next, manual);
            db.Memberships.AddRange(UnitMembership.Create("sub", old.Id, false, MembershipSource.Directory, now), UnitMembership.Create("sub", manual.Id, true, MembershipSource.Manual, now));
            await db.SaveChangesAsync();
            var service = Service(db, new FakeDirectory());
            var result = await service.SyncUserAsync("sub", "login", "operator", default);
            Assert.IsTrue(result.IsSuccess); db.ChangeTracker.Clear();
            var memberships = await db.Memberships.ToListAsync();
            Assert.AreEqual(2, memberships.Count); Assert.IsFalse(memberships.Any(x => x.UnitId == old.Id));
            Assert.IsTrue(memberships.Any(x => x.UnitId == manual.Id && x.IsPrimary && x.Source == MembershipSource.Manual));
            var run = await db.DirectoryRuns.SingleAsync(); Assert.AreEqual("operator", run.RequestedBy); Assert.AreEqual("Completed", run.Status);
            var failed = await Service(db, new FakeDirectory { Fail = true }).SyncUserAsync("sub", "login", "operator", default);
            Assert.IsTrue(failed.IsFailure); Assert.AreEqual(2, await db.Memberships.CountAsync());
            Assert.AreEqual(1, await db.DirectoryRuns.CountAsync(x => x.Status == "Failed"));
        });
    }
    [TestMethod, TestCategory("PostgreSQL")]
    public async Task UnitConflictRollsBackAllEarlierChangesButPreservesFailedRunEvidence()
    {
        await WithDatabase(async connection =>
        {
            await using var db = Context(connection);
            db.Units.Add(OrganizationUnit.CreateRoot("CONFLICT", "Conflict", null, "OU=Other", DateTimeOffset.UtcNow)); await db.SaveChangesAsync();
            var provider = new FakeDirectory { Units = [new("OU=A", "A", null), new("OU=Conflict,DC=Example", "Conflict", null)] };
            var result = await Service(db, provider).SyncUnitsAsync("operator", default);
            Assert.IsTrue(result.IsFailure); Assert.AreEqual("directory.unit_conflict", result.Error.Code);
            Assert.AreEqual(1, await db.Units.CountAsync()); Assert.AreEqual(1, await db.DirectoryRuns.CountAsync(x => x.Status == "Failed"));
        });
    }
    private static OrganizationDbContext Context(string connection) => new(new DbContextOptionsBuilder<OrganizationDbContext>().UseNpgsql(connection).Options);
    private static DirectoryAdministration Service(OrganizationDbContext db, FakeDirectory provider) => new(db,
        new DirectorySyncService(provider, new DirectoryUserProvisioning(new EfDirectoryUserStore(db), TimeProvider.System),
            new EfOrganizationRepository(db), db, TimeProvider.System, NullLogger<DirectorySyncService>.Instance),
        provider, new StaticDirectoryRuntime(),
        Options.Create(new LdapOptions { Host = "fake.invalid", UserSearchBase = "dc=fake", UnitSearchBase = "dc=fake" }), TimeProvider.System);

    /// <summary>Ayar veritabanından değil sabitten gelsin; test dizin bağlantısı kurmaz.</summary>
    private sealed class StaticDirectoryRuntime : IDirectoryRuntime
    {
        public DirectoryRuntimeSettings Current => DirectoryRuntimeSettings.Empty;
        public Task RefreshAsync(CancellationToken ct) => Task.CompletedTask;
    }
    private static async Task WithDatabase(Func<string, Task> run)
    {
        var configured = Environment.GetEnvironmentVariable("MBB_ARCHIVE_TEST_POSTGRES");
        if (string.IsNullOrWhiteSpace(configured)) { Assert.Inconclusive("Set MBB_ARCHIVE_TEST_POSTGRES to a disposable PostgreSQL server."); return; }
        var name = "mbb_directory_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(configured); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        var builder = new NpgsqlConnectionStringBuilder(configured) { Database = name, Pooling = false };
        try { await using (var db = Context(builder.ConnectionString)) await db.Database.MigrateAsync(); await run(builder.ConnectionString); }
        finally { await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }
    private sealed class FakeDirectory : IDirectoryClient
    {
        public bool IsConfigured => true; public bool Fail; public IReadOnlyList<DirectoryUnit> Units = [];
        public Task<Result<DirectoryUser>> FindUserAsync(string subjectId, CancellationToken ct) => Task.FromResult(Fail
            ? Result<DirectoryUser>.Failure(Error.Failure("directory.unreachable", "Local fake failure"))
            : Result<DirectoryUser>.Success(new(subjectId, "Name", "NEW", [])));
        public Task<Result<IReadOnlyList<DirectoryUnit>>> ListUnitsAsync(CancellationToken ct) => Task.FromResult(Result<IReadOnlyList<DirectoryUnit>>.Success(Units));
    }
}
