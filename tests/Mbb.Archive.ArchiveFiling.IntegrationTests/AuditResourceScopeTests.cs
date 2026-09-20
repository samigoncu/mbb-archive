using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Api.Infrastructure;
using Mbb.Archive.Api.Infrastructure.Auditing;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Dossiers;
using Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions;

namespace Mbb.Archive.ArchiveFiling.IntegrationTests;

[TestClass]
public sealed class AuditResourceScopeTests
{
    [TestMethod]
    public async Task Audit_names_obey_real_document_dossier_and_folder_unit_scope()
    {
        await using var fixture = new FilingFixture();
        await fixture.Initialize();
        fixture.Permissions = ["audit.read", "documents.read", "physical-archive.read"];
        var resolver = CreateResolver(fixture);
        Assert.IsNotNull(await resolver.ResolveResourceAsync("document", fixture.Document.Id.Value.ToString(), default));
        Assert.IsNotNull(await resolver.ResolveResourceAsync("dossier", fixture.Dossier.Id.ToString(), default));
        Assert.IsNotNull(await resolver.ResolveResourceAsync("folder", fixture.Folder.Id.ToString(), default));
        Assert.IsNull(await resolver.ResolveResourceAsync("document", fixture.OtherDocument.Id.Value.ToString(), default));
        Assert.IsNull(await resolver.ResolveResourceAsync("dossier", fixture.OtherDossier.Id.ToString(), default));
        Assert.IsNull(await resolver.ResolveResourceAsync("folder", fixture.OtherFolder.Id.ToString(), default));
    }

    [TestMethod]
    public async Task Audit_permission_alone_cannot_reveal_even_own_unit_resource_names()
    {
        await using var fixture = new FilingFixture();
        await fixture.Initialize();
        fixture.Permissions = ["audit.read"];
        var resolver = CreateResolver(fixture);
        Assert.IsNull(await resolver.ResolveResourceAsync("document", fixture.Document.Id.Value.ToString(), default));
        Assert.IsNull(await resolver.ResolveResourceAsync("dossier", fixture.Dossier.Id.ToString(), default));
        Assert.IsNull(await resolver.ResolveResourceAsync("folder", fixture.Folder.Id.ToString(), default));
    }

    private static AuditDisplayResolver CreateResolver(FilingFixture fixture)
        => new(fixture.Get<IDocumentQueries>(), fixture.Get<IDossierQueries>(), fixture.Get<IPhysicalArchiveQueries>(),
            null!, fixture, fixture, new HttpContextAccessor(), new TestEnvironment(), Options.Create(new ArchiveAuthenticationOptions()));

    private sealed class TestEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Audit scope tests";
        public string ContentRootPath { get; set; } = "/tmp";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
