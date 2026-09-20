using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Documents.GetById;
using Mbb.Archive.Modules.Documents.Application.Documents.GetContent;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIntegrity;
using Mbb.Archive.Modules.Documents.Application.Documents.GetVersions;
using Mbb.Archive.Modules.Documents.Application.Documents.List;

namespace Mbb.Archive.Modules.Documents.UnitTests;

[TestClass]
public sealed class DocumentIntegrityQueryTests
{
    private static readonly Guid DocumentId = Guid.CreateVersion7();

    [TestMethod]
    public async Task Handle_WithoutStoredVersion_ReturnsNotFound()
    {
        var handler = new GetDocumentIntegrityQueryHandler(new StubQueries(null), new StubScope());

        var result = await handler.Handle(
            new GetDocumentIntegrityQuery(DocumentId),
            CancellationToken.None);

        Assert.IsTrue(result.IsFailure);
        Assert.AreEqual("documents.version_not_found", result.Error.Code);
    }

    [TestMethod]
    public async Task Handle_WithStoredVersion_ReturnsHashWithoutStorageKey()
    {
        var descriptor = new DocumentVersionContentDescriptor(
            3,
            "originals/2026/abc",
            "application/pdf",
            2048,
            new string('a', 64));

        var handler = new GetDocumentIntegrityQueryHandler(new StubQueries(descriptor), new StubScope());

        var result = await handler.Handle(
            new GetDocumentIntegrityQuery(DocumentId),
            CancellationToken.None);

        Assert.IsTrue(result.IsSuccess);
        Assert.AreEqual(3, result.Value.VersionNumber);
        Assert.AreEqual("application/pdf", result.Value.MimeType);
        Assert.AreEqual(2048L, result.Value.SizeBytes);
        Assert.AreEqual(new string('a', 64), result.Value.Sha256Hash);
    }

    private sealed class StubQueries : IDocumentQueries
    {
        private readonly DocumentVersionContentDescriptor? _descriptor;

        public StubQueries(DocumentVersionContentDescriptor? descriptor)
        {
            _descriptor = descriptor;
        }

        public Task<DocumentVersionContentDescriptor?> GetLatestVersionContentAsync(
            Guid documentId,
            AccessScope scope,
            CancellationToken cancellationToken)
            => Task.FromResult(_descriptor);

        public Task<DocumentVersionContentDescriptor?> GetVersionContentAsync(Guid id, int? version, AccessScope scope, CancellationToken ct)
            => Task.FromResult(_descriptor);

        public Task<DocumentDetails?> GetByIdAsync(Guid id, AccessScope scope, CancellationToken ct)
            => throw new NotSupportedException();

        public Task<IReadOnlyList<DocumentVersionSummary>> GetVersionsAsync(
            Guid documentId,
            AccessScope scope,
            CancellationToken ct)
            => throw new NotSupportedException();

        public Task<PagedResult<DocumentListItem>> GetPageAsync(
            PageRequest page,
            DocumentListFilter filter,
            DocumentListSort sort,
            AccessScope scope,
            CancellationToken ct)
            => throw new NotSupportedException();

        public Task<DocumentIngestionDetails?> GetIngestionAsync(
            Guid documentId,
            Guid ingestionId,
            AccessScope scope,
            CancellationToken ct)
            => throw new NotSupportedException();
    }

    /// <summary>Kapsam üstü özne; bu testlerin konusu bütünlük künyesi.</summary>
    private sealed class StubScope : ICurrentUserScope
    {
        public Task<AccessScope> GetAsync(CancellationToken cancellationToken)
            => Task.FromResult(new AccessScope("test", true, [], [], [], []));
    }
}
