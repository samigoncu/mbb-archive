using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Documents.GetById;
using Mbb.Archive.Modules.Documents.Application.Documents.GetContent;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;
using Mbb.Archive.Modules.Documents.Application.Documents.GetVersions;
using Mbb.Archive.Modules.Documents.Application.Documents.List;

namespace Mbb.Archive.Modules.Documents.UnitTests;

[TestClass]
public sealed class DocumentVersionContentTests
{
    [TestMethod]
    public async Task SelectedVersion_UsesItsOriginalAndMimeTypeWithCurrentScope()
    {
        var f = new Fixture();
        var result = await f.Handler.Handle(new(f.Id, 1), default);
        Assert.IsTrue(result.IsSuccess);
        using var stream = result.Value.Stream;
        Assert.AreEqual("old-original", f.ReadKey);
        Assert.AreEqual("image/png", result.Value.MimeType);
        Assert.AreEqual($"{f.Id:D}-v1.png", result.Value.FileName);
        Assert.AreSame(f.Scope, f.RequestedScope);
        Assert.AreEqual(1, f.RequestedVersion);
    }

    [TestMethod]
    public async Task OmittedVersion_StillReadsLatest()
    {
        var f = new Fixture();
        var result = await f.Handler.Handle(new(f.Id), default);
        using var stream = result.Value.Stream;
        Assert.AreEqual("latest-original", f.ReadKey);
        Assert.AreEqual("application/pdf", result.Value.MimeType);
        Assert.IsNull(f.RequestedVersion);
    }

    [TestMethod]
    public async Task MissingVersion_DoesNotFallBackToLatestOrReadStorage()
    {
        var f = new Fixture();
        var result = await f.Handler.Handle(new(f.Id, 99), default);
        Assert.AreEqual("documents.content_not_available", result.Error.Code);
        Assert.IsNull(f.ReadKey);
    }

    [TestMethod]
    public async Task InvisibleVersion_DoesNotReadStorage()
    {
        var f = new Fixture { Visible = false };
        Assert.IsTrue((await f.Handler.Handle(new(f.Id, 1), default)).IsFailure);
        Assert.IsNull(f.ReadKey);
        Assert.AreSame(f.Scope, f.RequestedScope);
    }

    [TestMethod]
    public async Task InvalidVersion_IsRejectedBeforeQueryOrStorage()
    {
        var f = new Fixture();
        Assert.AreEqual("documents.invalid_version", (await f.Handler.Handle(new(f.Id, 0), default)).Error.Code);
        Assert.AreEqual("documents.invalid_version", (await f.Handler.Handle(new(f.Id, -1), default)).Error.Code);
        Assert.IsNull(f.RequestedScope);
        Assert.IsNull(f.ReadKey);
    }

    [TestMethod]
    public async Task MissingStoredObject_IsAnIntegrityError()
    {
        var f = new Fixture { StorageMissing = true };
        Assert.AreEqual("documents.original_missing_in_storage", (await f.Handler.Handle(new(f.Id, 1), default)).Error.Code);
        Assert.AreEqual("old-original", f.ReadKey);
    }

    private sealed class Fixture : IDocumentQueries, ICurrentUserScope, IOriginalObjectStorage
    {
        public Guid Id = Guid.NewGuid();
        public AccessScope Scope = new("reader", false, [], [], [], []);
        public AccessScope? RequestedScope;
        public int? RequestedVersion;
        public string? ReadKey;
        public bool Visible = true;
        public bool StorageMissing;
        public GetDocumentContentQueryHandler Handler => new(this, this, this);
        public Task<AccessScope> GetAsync(CancellationToken ct) => Task.FromResult(Scope);
        public Task<DocumentVersionContentDescriptor?> GetVersionContentAsync(Guid id, int? version, AccessScope scope, CancellationToken ct)
        {
            RequestedScope = scope; RequestedVersion = version;
            return Task.FromResult<DocumentVersionContentDescriptor?>(!Visible || id != Id ? null : version switch
            {
                1 => new(1, "old-original", "image/png", 3, new string('a', 64)),
                null or 2 => new(2, "latest-original", "application/pdf", 4, new string('b', 64)),
                _ => null
            });
        }
        public Task<Stream?> OpenReadAsync(string key, CancellationToken ct)
        { ReadKey = key; return Task.FromResult<Stream?>(StorageMissing ? null : new MemoryStream([1, 2, 3])); }
        public Task<DocumentVersionContentDescriptor?> GetLatestVersionContentAsync(Guid id, AccessScope scope, CancellationToken ct) => throw new NotSupportedException();
        public Task<DocumentDetails?> GetByIdAsync(Guid id, AccessScope scope, CancellationToken ct) => throw new NotSupportedException();
        public Task<IReadOnlyList<DocumentVersionSummary>> GetVersionsAsync(Guid id, AccessScope scope, CancellationToken ct) => throw new NotSupportedException();
        public Task<PagedResult<DocumentListItem>> GetPageAsync(PageRequest page, DocumentListFilter filter, DocumentListSort sort, AccessScope scope, CancellationToken ct) => throw new NotSupportedException();
        public Task<DocumentIngestionDetails?> GetIngestionAsync(Guid id, Guid ingestionId, AccessScope scope, CancellationToken ct) => throw new NotSupportedException();
        public Task<StoredOriginalDescriptor> StoreAsync(string hash, string mime, long size, Stream stream, CancellationToken ct) => throw new NotSupportedException();
        public Task<ObjectFixityResult> VerifyAsync(string key, string hash, long size, CancellationToken ct) => throw new NotSupportedException();
    }
}
