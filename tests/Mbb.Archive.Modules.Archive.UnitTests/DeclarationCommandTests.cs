using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Archive.Application;
using Mbb.Archive.Modules.Archive.Application.Abstractions;
using Mbb.Archive.Modules.Archive.Application.Records.Declare;
using Mbb.Archive.Modules.Archive.Domain.Records;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Retention.Contracts;

namespace Mbb.Archive.Modules.Archive.UnitTests;

[TestClass]
public sealed class DeclarationCommandTests
{
    [TestMethod]
    public async Task UnknownRule_CannotDeclareOrPublish()
    {
        var fixture = new Fixture { ValidRule = false };
        var result = await fixture.Handle();
        Assert.IsTrue(result.IsFailure); Assert.AreEqual("archive.invalid_retention_rule", result.Error.Code);
        Assert.AreEqual(ArchiveRecordStatus.Candidate, fixture.Record.Status); Assert.AreEqual(0, fixture.Events.Count);
    }
    [TestMethod]
    public async Task InactiveFilePlan_CannotDeclareOrPublish()
    {
        var fixture = new Fixture { ValidClassification = false };
        var result = await fixture.Handle(); Assert.IsTrue(result.IsFailure);
        Assert.AreEqual("archive.invalid_classification", result.Error.Code); Assert.AreEqual(0, fixture.Saves);
    }
    [TestMethod]
    public async Task RepeatedDeclaration_EmitsExactlyOneEvent()
    {
        var fixture = new Fixture();
        Assert.IsTrue((await fixture.Handle()).IsSuccess);
        fixture.ValidClassification = false;
        Assert.IsTrue((await fixture.Handle()).IsSuccess);
        Assert.AreEqual(1, fixture.Events.Count); Assert.AreEqual(1, fixture.Saves);
    }
    [TestMethod]
    public async Task RepeatedDeclaration_WithDifferentPolicyIsRejected()
    {
        var fixture = new Fixture(); await fixture.Handle();
        var result = await fixture.Handler.Handle(new(fixture.Record.Id.Value, "100.01", "R2"), default);
        Assert.IsTrue(result.IsFailure); Assert.AreEqual("R1", fixture.Record.RetentionRuleCode);
        Assert.AreEqual(1, fixture.Events.Count);
    }

    [TestMethod]
    public async Task OutOfScopeDeclaration_DoesNotMutateOrPublish()
    {
        var fixture = new Fixture { Visible = false };
        var result = await fixture.Handle();
        Assert.AreEqual("archive.record_not_found", result.Error.Code);
        Assert.AreEqual(ArchiveRecordStatus.Candidate, fixture.Record.Status);
        Assert.AreEqual(0, fixture.Saves); Assert.AreEqual(0, fixture.Events.Count);
    }

    private sealed class Fixture : IArchiveRecordRepository, IFilePlanCatalog, IRetentionRuleCatalog,
        IUnitOfWork<ArchiveBoundary>, IOutbox<ArchiveBoundary>, IDocumentVisibility
    {
        public ArchiveRecord Record { get; } = ArchiveRecord.RegisterCandidate(Guid.NewGuid(), Guid.NewGuid(), "original",
            new string('a', 64), "application/pdf", 20, null, DateTimeOffset.UtcNow);
        public bool Visible { get; set; } = true;
        public Task<IReadOnlySet<Guid>> FilterAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct) => Task.FromResult<IReadOnlySet<Guid>>(Visible ? ids.ToHashSet() : new HashSet<Guid>());
        public bool ValidRule { get; set; } = true;
        public bool ValidClassification { get; set; } = true;
        public List<IIntegrationEvent> Events { get; } = [];
        public int Saves { get; private set; }
        public DeclareArchiveRecordCommandHandler Handler => new(this, this, this, TimeProvider.System, this, this, this);
        public Task<Result> Handle() => Handler.Handle(new(Record.Id.Value, "100.01", "R1"), default);
        public Task AddAsync(ArchiveRecord record, CancellationToken ct) => Task.CompletedTask;
        public Task<ArchiveRecord?> GetAsync(ArchiveRecordId id, CancellationToken ct) => Task.FromResult<ArchiveRecord?>(Record.Id == id ? Record : null);
        public Task<ArchiveRecord?> GetByDocumentVersionAsync(Guid id, CancellationToken ct) => Task.FromResult<ArchiveRecord?>(Record);
        public Task<ArchiveRecord?> GetByDocumentIdAsync(Guid id, CancellationToken ct) => Task.FromResult<ArchiveRecord?>(Record);
        public Task<bool> IsSelectableAsync(string code, DateOnly at, CancellationToken ct) => Task.FromResult(ValidClassification);
        public Task<bool> ExistsAsync(string code, CancellationToken ct) => Task.FromResult(ValidRule);
        public Task<int> SaveChangesAsync(CancellationToken ct = default) { Saves++; return Task.FromResult(1); }
        public void Enqueue(IIntegrationEvent integrationEvent) => Events.Add(integrationEvent);
    }
}
