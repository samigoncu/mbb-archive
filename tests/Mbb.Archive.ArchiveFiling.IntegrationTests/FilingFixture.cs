using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Npgsql;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Dossiers;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;
using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;

internal sealed class FilingFixture : ICurrentUserScope, IArchiveUnitDirectory, ICurrentUserPermissions, IFilePlanCatalog, IFilePlanEntryCatalog, IUnitFilePlanPolicy, ILoanBorrowerDirectory, IAsyncDisposable
{
    public Guid Owner { get; } = Guid.NewGuid();
    public Guid Other { get; } = Guid.NewGuid();
    public Guid Child { get; } = Guid.NewGuid();
    public Guid Plan { get; private set; } = Guid.NewGuid();
    public Guid Item { get; private set; } = Guid.NewGuid();
    public Guid AlternateItem { get; private set; }
    public string Path => $"/TEST/{Owner}/";
    public AccessScope Scope { get; set; } = AccessScope.Empty("test");
    public IReadOnlyCollection<string> Permissions { get; set; } = [];
    public bool GlobalWrite { get; set; }
    public bool AssignedPlan { get; set; } = true;
    public bool ValidPlan { get; set; } = true;
    public Action<IServiceCollection>? ConfigureServices { get; set; }
    public ServiceProvider Provider { get; private set; } = null!;
    public IServiceScope Services { get; private set; } = null!;
    public DigitalDossier Dossier { get; private set; } = null!;
    public DigitalDossier OtherDossier { get; private set; } = null!;
    public Document Document { get; private set; } = null!;
    public Document OtherDocument { get; private set; } = null!;
    public PhysicalFolder Folder { get; private set; } = null!;
    public PhysicalFolder OtherFolder { get; private set; } = null!;
    public PhysicalFolder LegacyFolder { get; private set; } = null!;
    public ArchiveLocation Shelf { get; private set; } = null!;
    public ArchiveLocationTypeDefinition ShelfType { get; private set; } = null!;
    public T Get<T>() where T : notnull => Services.ServiceProvider.GetRequiredService<T>();
    public async Task Initialize(bool withClassification = false)
    {
        var connection = Environment.GetEnvironmentVariable("MBB_ARCHIVE_TEST_POSTGRES");
        if (string.IsNullOrEmpty(connection)) Assert.Inconclusive("Set MBB_ARCHIVE_TEST_POSTGRES to an isolated mbb_archive_*tests* database.");
        var name = new NpgsqlConnectionStringBuilder(connection).Database;
        Assert.IsTrue(name?.StartsWith("mbb_archive_", StringComparison.Ordinal) == true && name.Contains("tests", StringComparison.Ordinal));
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["ConnectionStrings:Documents"] = connection, ["ConnectionStrings:PhysicalArchive"] = connection,
            ["ConnectionStrings:Classification"] = connection }).Build();
        var services = new ServiceCollection(); services.AddLogging();
        services.AddSingleton<ICurrentUserScope>(this); services.AddSingleton<IArchiveUnitDirectory>(this);
        services.AddSingleton<ICurrentUserPermissions>(this); services.AddSingleton<IFilePlanCatalog>(this); services.AddSingleton<IFilePlanEntryCatalog>(this); services.AddSingleton<IUnitFilePlanPolicy>(this);
        services.AddDocumentsModule(config); services.AddPhysicalArchiveModule(config);
        services.AddSingleton<ILoanBorrowerDirectory>(this);
        if (withClassification) Mbb.Archive.Modules.Classification.Infrastructure.ClassificationModule.AddClassificationModule(services, config);
        ConfigureServices?.Invoke(services);
        Provider = services.BuildServiceProvider(); Services = Provider.CreateScope();
        var docs = Get<DocumentsDbContext>(); var physical = Get<PhysicalArchiveDbContext>();
        await docs.Database.MigrateAsync(); await physical.Database.MigrateAsync();
        Scope = new("test", false, [Path], [Owner], [], [], Owner, Path);
        var now = DateTimeOffset.UtcNow;
        if (withClassification)
        {
            var db = Get<Mbb.Archive.Modules.Classification.Infrastructure.Persistence.ClassificationDbContext>();
            await db.Database.MigrateAsync();
            var plan = Mbb.Archive.Modules.Classification.Domain.FilePlans.FilePlan.Create(Guid.NewGuid().ToString(), "Test planı", "2026-v1", "Test", new(2020, 1, 1), null);
            Item = plan.AddItem(null, "TEST.01", "İlk konu", 1, true).Id.Value;
            AlternateItem = plan.AddItem(null, "TEST.02", "İkinci konu", 1, true).Id.Value;
            Plan = plan.Id.Value; db.Add(plan); await db.SaveChangesAsync();
        }
        Dossier = DigitalDossier.Create(Owner, Plan, Item, "2026-v1", "TEST.01", "Test konu", "BID dosyası", 2026, now);
        OtherDossier = DigitalDossier.Create(Other, Plan, Item, "2026-v1", "TEST.01", "Test konu", "Diğer daire", 2026, now);
        Document = Document.Create("BID belgesi", now); Document.AssignOwnerUnit(Owner, Path); Document.FileIn(Dossier);
        OtherDocument = Document.Create("Diğer belge", now); OtherDocument.AssignOwnerUnit(Other, $"/OTHER/{Other}/"); OtherDocument.FileIn(OtherDossier);
        docs.AddRange(Dossier, OtherDossier, Document, OtherDocument); await docs.SaveChangesAsync();
        // Seviye kataloğu artık veri ve migration ile kuruluyor; test de aynı
        // satırları okur. Yeniden eklemek kod üzerinde benzersizlik ihlali
        // verirdi ve gerçek kurulumdan farklı bir katalogla test edilirdi.
        var types = await physical.Set<ArchiveLocationTypeDefinition>()
            .ToDictionaryAsync(x => x.Code);

        var root = ArchiveLocation.CreateRoot(types["InstitutionArchive"], Owner.ToString(), "Test arşivi", Guid.NewGuid().ToString(), now);
        var parent = root;
        var parentType = types["InstitutionArchive"];
        physical.Add(root);
        foreach (var code in new[] { "Building", "ArchiveArea", "Room", "Aisle", "Cabinet", "Shelf" })
        {
            var type = types[code];
            parent = ArchiveLocation.CreateChild(parent, parentType, type, Guid.NewGuid().ToString(), "Test " + type.Name,
                Guid.NewGuid().ToString(), code == "Shelf" ? 100 : null, now);
            parentType = type;
            physical.Add(parent);
        }
        Shelf = parent;
        ShelfType = types["Shelf"];
        Folder = PhysicalFolder.Register(Guid.NewGuid().ToString(), "BID fiziksel", "TEST.01", Shelf, ShelfType, now); Folder.AssignOwnership(Owner, Dossier.Id); Folder.LinkDocument(Document.Id.Value, now);
        OtherFolder = PhysicalFolder.Register(Guid.NewGuid().ToString(), "Diğer fiziksel", "TEST.01", Shelf, ShelfType, now); OtherFolder.AssignOwnership(Other, OtherDossier.Id);
        LegacyFolder = PhysicalFolder.Register(Guid.NewGuid().ToString(), "Sahipsiz", "TEST.01", Shelf, ShelfType, now);
        physical.AddRange(Folder, OtherFolder, LegacyFolder);
        if (!withClassification)
        {
            physical.Add(PhysicalLoan.Start(Folder.Id, "bid", "test", now, now.AddDays(1)));
            physical.Add(PhysicalLoan.Start(OtherFolder.Id, "other", "test", now, now.AddDays(1)));
        }
        await physical.SaveChangesAsync();
    }
    public Task<AccessScope> GetAsync(CancellationToken ct) => Task.FromResult(Scope);
    public Task<IReadOnlyList<ArchiveUnit>> GetVisibleAsync(CancellationToken ct)
    {
        ArchiveUnit[] all = [new(Owner, "Bilgi İşlem", Path, null, true, true, true, true),
            new(Child, "Alt birim", Path + "CHILD/", Owner, true, false, true, true),
            new(Other, "Diğer daire", $"/OTHER/{Other}/", null, true, false, GlobalWrite, GlobalWrite)];
        return Task.FromResult<IReadOnlyList<ArchiveUnit>>(all.Where(u => Scope.Unrestricted || Scope.UnitPaths.Any(p => u.Path.StartsWith(p, StringComparison.Ordinal))).ToArray());
    }
    public async Task<ArchiveUnit?> ResolveWritableAsync(Guid? id, string permission, CancellationToken ct)
        => (await GetVisibleAsync(ct)).FirstOrDefault(u => u.Id == (id ?? Scope.PrimaryUnitId)
            && (GlobalWrite || Scope.UnitPaths.Any(p => u.Path.StartsWith(p, StringComparison.Ordinal))));
    public string Subject => "test";
    public IReadOnlyCollection<string> Groups => [];
    public Task<bool> HasAllPermissionsAsync(CancellationToken ct) => Task.FromResult(GlobalWrite);
    public Task<IReadOnlyCollection<string>> GetAsync(CancellationToken ct, bool ignored = false) => Task.FromResult(Permissions);
    Task<IReadOnlyCollection<string>> ICurrentUserPermissions.GetAsync(CancellationToken ct) => GetAsync(ct, false);
    public Task<bool> IsSelectableAsync(string code, DateOnly at, CancellationToken ct) => Task.FromResult(ValidPlan);
    public Task<bool> IsActiveAsync(string subjectId, CancellationToken ct) => Task.FromResult(subjectId is "borrower" or "other" or "next" or "bid");
    public Task<PagedResult<LoanBorrower>> SearchAsync(string query, PageRequest page, CancellationToken ct)
    {
        var people = new[] { "borrower", "other", "next", "bid" }.Where(x => x.Contains(query, StringComparison.OrdinalIgnoreCase)).Order().ToArray();
        return Task.FromResult(new PagedResult<LoanBorrower>(people.Skip((page.Page - 1) * page.PageSize).Take(page.PageSize).Select(x => new LoanBorrower(x, "Test birimi")).ToArray(), page.Page, page.PageSize, people.Length));
    }
    public Task<FilePlanEntry?> GetSelectableAsync(Guid plan, Guid item, DateOnly at, CancellationToken ct)
        => Task.FromResult<FilePlanEntry?>(ValidPlan ? new(Plan, Item, "2026-v1", "TEST.01", "Test konu") : null);
    public Task<bool> IsAssignedAsync(Guid owner, Guid plan, Guid item, CancellationToken ct) => Task.FromResult(AssignedPlan);
    public Task<bool> IsCodeAssignedAsync(Guid owner, string code, CancellationToken ct) => Task.FromResult(AssignedPlan);
    public Task<IReadOnlyList<UnitFilePlanEntry>> GetAssignedAsync(Guid owner, CancellationToken ct)
        => Task.FromResult<IReadOnlyList<UnitFilePlanEntry>>(AssignedPlan ? [new(owner, Plan, Item, "TEST.01", "Test konu", "2026-v1")] : []);
    public async ValueTask DisposeAsync() { Services?.Dispose(); if (Provider is not null) await Provider.DisposeAsync(); }
}
