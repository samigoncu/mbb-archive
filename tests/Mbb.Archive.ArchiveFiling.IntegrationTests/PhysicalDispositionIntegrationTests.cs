using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
using Mbb.Archive.Modules.PhysicalArchive.Contracts;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

namespace Mbb.Archive.ArchiveFiling.IntegrationTests;

[TestClass, DoNotParallelize]
public sealed class PhysicalDispositionIntegrationTests
{
    [TestMethod]
    public async Task PersistedPhysicalEvidence_PreservesDigitalRecordAndIsIdempotent()
    {
        await using var fixture = new FilingFixture(); await fixture.Initialize(withClassification: true);
        var documents = fixture.Get<DocumentsDbContext>();
        var evidence = Document.Create("Fiziksel imha tutanağı", DateTimeOffset.UtcNow);
        evidence.AssignOwnerUnit(fixture.Owner, fixture.Path); evidence.FileIn(fixture.Dossier);
        documents.Add(evidence); await documents.SaveChangesAsync();
        var physical = fixture.Get<PhysicalArchiveDbContext>(); var gateway = fixture.Get<IPhysicalDispositionGateway>();
        var processId = Guid.NewGuid(); var at = DateTimeOffset.UtcNow;
        var result = await gateway.RecordAsync(fixture.Document.Id.Value, processId, "executor", "İMHA-26", evidence.Id.Value, at, default);
        Assert.IsTrue(result.IsSuccess, result.IsFailure ? result.Error.Description : "");
        Assert.IsTrue((await gateway.RecordAsync(fixture.Document.Id.Value, processId, "executor", "İMHA-26", evidence.Id.Value, at, default)).IsSuccess);
        physical.ChangeTracker.Clear();
        var stored = await physical.Set<PhysicalFolder>().Include(x => x.Documents).SingleAsync(x => x.Id == fixture.Folder.Id);
        Assert.AreEqual(PhysicalFolderStatus.Disposed, stored.Status);
        Assert.AreEqual(processId, stored.Documents.Single().DispositionProcessId);
        Assert.AreEqual(evidence.Id.Value, stored.Documents.Single().DispositionEvidenceDocumentId);
        Assert.AreEqual(fixture.Document.Id.Value, stored.Documents.Single().DocumentId);
        Assert.IsNotNull(await documents.Set<Document>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == fixture.Document.Id));
    }

    [TestMethod]
    public async Task PhysicalExecution_RejectsCrossUnitAndOpenLoanWithoutEvidenceMutation()
    {
        await using var fixture = new FilingFixture(); await fixture.Initialize();
        var gateway = fixture.Get<IPhysicalDispositionGateway>();
        var hidden = await gateway.RecordAsync(fixture.OtherDocument.Id.Value, Guid.NewGuid(), "executor", "T26", fixture.Document.Id.Value, DateTimeOffset.UtcNow, default);
        Assert.IsTrue(hidden.IsFailure); Assert.AreEqual(ErrorType.NotFound, hidden.Error.Type);
        var loan = await gateway.RecordAsync(fixture.Document.Id.Value, Guid.NewGuid(), "executor", "T26", fixture.Document.Id.Value, DateTimeOffset.UtcNow, default);
        Assert.IsTrue(loan.IsFailure); Assert.AreEqual("physical_archive.active_loan", loan.Error.Code);
        Assert.IsNull(fixture.Folder.Documents.Single().DisposedAt);
    }

    [TestMethod]
    public async Task ConcurrentCheckout_CannotOverwritePhysicalDisposition()
    {
        await using var fixture = new FilingFixture(); await fixture.Initialize(withClassification: true);
        var original = fixture.Get<PhysicalArchiveDbContext>();
        await using var stale = new PhysicalArchiveDbContext(new DbContextOptionsBuilder<PhysicalArchiveDbContext>()
            .UseNpgsql(Environment.GetEnvironmentVariable("MBB_ARCHIVE_TEST_POSTGRES")).Options);
        var staleFolder = await stale.Set<PhysicalFolder>().SingleAsync(x => x.Id == fixture.Folder.Id);
        fixture.Folder.RecordPhysicalDisposition(fixture.Document.Id.Value, Guid.NewGuid(), "executor", "T26", Guid.NewGuid(), DateTimeOffset.UtcNow);
        await original.SaveChangesAsync();
        staleFolder.CheckOut();
        await Assert.ThrowsExactlyAsync<ConcurrencyConflictException>(() => stale.SaveChangesAsync());
    }
}
