using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application;
using Mbb.Archive.Modules.Documents.Application.Settings;
using Mbb.Archive.Modules.Documents.Domain.Settings;
using Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
namespace Mbb.Archive.Modules.Documents.UnitTests;
[TestClass]
public sealed class UploadPolicyTests
{
    [TestMethod] public async Task AdminChangeIsPersistedWithBeforeAfterAuditAndVersion()
    {
        var f = new Fixture(); var result = await f.Handler.UpdateAsync(new(512, 1), default);
        Assert.IsTrue(result.IsSuccess); Assert.AreEqual(512L * 1024 * 1024, result.Value.MaxUploadBytes);
        Assert.AreEqual(1, f.Saves); Assert.AreEqual(2L, result.Value.Version);
        var audit = (UploadPolicyChangedIntegrationEvent)f.Events.Single();
        Assert.AreEqual(200, audit.PreviousMaxFileSizeMb); Assert.AreEqual(512, audit.MaxFileSizeMb); Assert.AreEqual("admin", audit.Actor);
    }
    [TestMethod] public async Task NonAdminCannotMutateOrAuditSuccess()
    {
        var f = new Fixture { Admin = false };
        Assert.IsTrue((await f.Handler.UpdateAsync(new(512, 1), default)).IsFailure);
        Assert.AreEqual(200, f.Policy.MaxFileSizeMb); Assert.AreEqual(0, f.Saves); Assert.AreEqual(0, f.Events.Count);
    }
    [TestMethod] public async Task StaleVersionAndInvalidSizesPreserveState()
    {
        var f = new Fixture();
        foreach (var request in new[] { new UpdateUploadPolicy(512, 0), new(0, 1), new(2049, 1) })
            Assert.IsTrue((await f.Handler.UpdateAsync(request, default)).IsFailure);
        Assert.AreEqual(0, f.Saves); Assert.AreEqual(0, f.Events.Count);
    }
    [TestMethod] public async Task InfrastructureCeilingCannotBeExceeded()
    {
        var f = new Fixture { InfrastructureMaxBytes = 100 * 1024 * 1024 };
        Assert.AreEqual(100, (await f.Handler.GetAsync(default)).MaxFileSizeMb);
        Assert.IsTrue((await f.Handler.UpdateAsync(new(101, 1), default)).IsFailure);
    }
    private sealed class Fixture : IUploadPolicyStore, ICurrentUserPermissions, IUnitOfWork<DocumentsBoundary>, IOutbox<DocumentsBoundary>
    {
        public UploadPolicy Policy { get; } = new();
        public bool Admin { get; set; } = true;
        public int Saves { get; private set; }
        public List<IIntegrationEvent> Events { get; } = [];
        public UploadPolicyHandler Handler => new(this, this, this, this, TimeProvider.System);
        public long InfrastructureMaxBytes { get; set; } = 2L * 1024 * 1024 * 1024;
        public Task<UploadPolicy> GetAsync(CancellationToken ct) => Task.FromResult(Policy);
        public string Subject => "admin";
        public IReadOnlyCollection<string> Groups => [];
        public Task<bool> HasAllPermissionsAsync(CancellationToken ct) => Task.FromResult(false);
        Task<IReadOnlyCollection<string>> ICurrentUserPermissions.GetAsync(CancellationToken ct) => Task.FromResult<IReadOnlyCollection<string>>(Admin ? ["access.admin"] : ["documents.write"]);
        public Task<int> SaveChangesAsync(CancellationToken ct = default) { Saves++; return Task.FromResult(1); }
        public void Enqueue(IIntegrationEvent message) => Events.Add(message);
    }
}
