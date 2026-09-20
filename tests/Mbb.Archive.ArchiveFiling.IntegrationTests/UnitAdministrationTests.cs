using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Organization.Application.Units;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
using Mbb.Archive.Modules.Organization.Domain.Units;
using Mbb.Archive.Modules.Organization.Infrastructure;
using Mbb.Archive.Modules.Organization.Infrastructure.Persistence;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
using Mbb.Archive.Modules.Documents.Application.Dossiers;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;

[TestClass]
public sealed class UnitAdministrationTests
{
    [TestMethod]
    public async Task Missing_unit_fields_are_validation_errors_before_repository_access()
    {
        var handler = new OrganizationCommandHandlers(null!, null!, TimeProvider.System, [], null!);
        var result = await handler.Handle(new CreateUnitCommand(null!, null!, null, null, null), default);
        Assert.IsTrue(result.IsFailure);
        Assert.AreEqual("organization.invalid_unit", result.Error.Code);
    }

    [TestMethod]
    public async Task Assignment_persists_before_files_exist_and_does_not_inherit_to_other_units()
    {
        await using var f = await AdminFixture.Create();
        var result = await f.Handler.SavePlansAsync(f.Unit.Id.Value, new(1, [new(f.Filing.Plan, f.Filing.Item)]), default);
        Assert.IsTrue(result.IsSuccess);
        Assert.AreEqual(2L, result.Value);
        Assert.IsTrue(await f.Get<IUnitFilePlanPolicy>().IsAssignedAsync(f.Unit.Id.Value, f.Filing.Plan, f.Filing.Item, default));
        Assert.IsFalse(await f.Get<IUnitFilePlanPolicy>().IsAssignedAsync(Guid.NewGuid(), f.Filing.Plan, f.Filing.Item, default));
        Assert.AreEqual(1, (await f.Handler.GetPlansAsync(f.Unit.Id.Value, default)).Value.Items.Count);
    }
    [TestMethod]
    public async Task Invalid_new_topic_and_stale_revision_cannot_replace_saved_selection()
    {
        await using var f = await AdminFixture.Create();
        await f.Handler.SavePlansAsync(f.Unit.Id.Value, new(1, [new(f.Filing.Plan, f.Filing.Item)]), default);
        Assert.IsTrue((await f.Handler.SavePlansAsync(f.Unit.Id.Value, new(1, []), default)).IsFailure);
        f.Filing.ValidPlan = false;
        Assert.IsTrue((await f.Handler.SavePlansAsync(f.Unit.Id.Value, new(2, [new(Guid.NewGuid(), Guid.NewGuid())]), default)).IsFailure);
        Assert.AreEqual(1, (await f.Handler.GetPlansAsync(f.Unit.Id.Value, default)).Value.Items.Count);
    }
    [TestMethod]
    public async Task Unassigned_topic_is_rejected_when_creating_digital_dossier()
    {
        await using var f = new FilingFixture(); await f.Initialize(); f.AssignedPlan = false;
        var result = await f.Get<DossierHandlers>().CreateAsync(new(f.Owner, f.Plan, f.Item, "Yetkisiz konu", 2026), default);
        Assert.IsTrue(result.IsFailure);
        Assert.AreEqual("dossiers.unit_plan_required", result.Error.Code);
    }
    [TestMethod]
    public async Task Delete_rejects_children_and_memberships()
    {
        await using var f = await AdminFixture.Create();
        var child = f.Unit.CreateChild(Guid.NewGuid().ToString(), "Alt birim", null, null, DateTimeOffset.UtcNow);
        f.Db.Add(child); await f.Db.SaveChangesAsync();
        Assert.IsTrue((await f.Handler.RemoveAsync(f.Unit.Id.Value, default)).IsFailure);
        f.Db.Add(UnitMembership.Create("test-member", child.Id, true, MembershipSource.Manual, DateTimeOffset.UtcNow));
        await f.Db.SaveChangesAsync();
        Assert.IsTrue((await f.Handler.RemoveAsync(child.Id.Value, default)).IsFailure);
    }
    [TestMethod]
    public async Task Delete_rejects_archived_content_even_outside_current_users_read_scope()
    {
        await using var f = await AdminFixture.Create();
        var document = Document.Create("Saklanacak belge", DateTimeOffset.UtcNow); document.AssignOwnerUnit(f.Unit.Id.Value, f.Unit.Path);
        var docs = f.Filing.Get<DocumentsDbContext>(); docs.Add(document); await docs.SaveChangesAsync();
        Assert.IsTrue((await f.Handler.RemoveAsync(f.Unit.Id.Value, default)).IsFailure);
        Assert.IsFalse(f.Unit.IsRemoved);
    }
    [TestMethod]
    public async Task Delete_removes_unused_unit_from_tree_and_keeps_identity_tombstone()
    {
        await using var f = await AdminFixture.Create();
        Assert.IsTrue((await f.Handler.RemoveAsync(f.Unit.Id.Value, default)).IsSuccess);
        Assert.IsFalse((await f.Get<IOrganizationQueries>().GetTreeAsync(true, default)).Any(unit => unit.Id == f.Unit.Id.Value));
        Assert.IsTrue(f.Unit.IsRemoved); Assert.IsFalse(f.Unit.IsActive);
        Assert.IsTrue(await f.Db.Set<OrganizationUnit>().AnyAsync(unit => unit.Id == f.Unit.Id));
    }
    private sealed class AdminFixture : IAsyncDisposable
    {
        public FilingFixture Filing { get; } = new();
        private ServiceProvider _provider = null!;
        private IServiceScope _scope = null!;
        public OrganizationUnit Unit { get; private set; } = null!;
        public OrganizationDbContext Db => Get<OrganizationDbContext>();
        public UnitAdministrationHandlers Handler => Get<UnitAdministrationHandlers>();
        public T Get<T>() where T : notnull => _scope.ServiceProvider.GetRequiredService<T>();
        public static async Task<AdminFixture> Create()
        {
            var fixture = new AdminFixture(); await fixture.Filing.Initialize();
            var services = new ServiceCollection(); services.AddLogging();
            services.AddSingleton<IFilePlanEntryCatalog>(fixture.Filing);
            foreach (var usage in fixture.Filing.Services.ServiceProvider.GetServices<IOrganizationUnitUsage>()) services.AddSingleton(usage);
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
                ["ConnectionStrings:Organization"] = Environment.GetEnvironmentVariable("MBB_ARCHIVE_TEST_POSTGRES") }).Build();
            services.AddOrganizationModule(config); fixture._provider = services.BuildServiceProvider(); fixture._scope = fixture._provider.CreateScope();
            await fixture.Db.Database.MigrateAsync();
            fixture.Unit = OrganizationUnit.CreateRoot(Guid.NewGuid().ToString(), "Test birimi", null, null, DateTimeOffset.UtcNow);
            fixture.Db.Add(fixture.Unit); await fixture.Db.SaveChangesAsync();
            return fixture;
        }
        public async ValueTask DisposeAsync() { _scope?.Dispose(); if (_provider is not null) await _provider.DisposeAsync(); await Filing.DisposeAsync(); }
    }
}
