using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Application;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Application.Metadata.Manage;
using Mbb.Archive.Modules.Classification.Domain.Documents;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
using Mbb.Archive.Modules.Classification.Domain.Metadata;

namespace Mbb.Archive.Modules.Classification.UnitTests;

[TestClass]
public sealed class MetadataSchemaManagementTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 2, 9, 0, 0, TimeSpan.Zero);

    private sealed class FakeClassificationRepository : IClassificationRepository
    {
        public readonly Dictionary<MetadataSchemaId, MetadataSchema> Schemas = [];
        public MetadataSchema? RemovedSchema { get; private set; }
        public bool HasDocumentMetadataResult { get; set; }

        public Task AddFilePlanAsync(FilePlan plan, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<FilePlan?> GetFilePlanAsync(FilePlanId id, CancellationToken cancellationToken) => Task.FromResult<FilePlan?>(null);
        public Task AddSchemaAsync(MetadataSchema schema, CancellationToken cancellationToken)
        {
            Schemas[schema.Id] = schema;
            return Task.CompletedTask;
        }
        public Task<MetadataSchema?> GetSchemaAsync(MetadataSchemaId id, CancellationToken cancellationToken)
        {
            Schemas.TryGetValue(id, out var schema);
            return Task.FromResult(schema);
        }
        public Task AddClassificationAsync(DocumentClassification classification, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task AddMetadataSetAsync(DocumentMetadataSet metadataSet, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task<DocumentMetadataSet?> GetMetadataSetAsync(Guid documentId, MetadataSchemaId schemaId, CancellationToken cancellationToken) => Task.FromResult<DocumentMetadataSet?>(null);
        public Task<bool> HasDocumentMetadataAsync(MetadataSchemaId schemaId, CancellationToken cancellationToken) => Task.FromResult(HasDocumentMetadataResult);
        public void RemoveSchema(MetadataSchema schema)
        {
            RemovedSchema = schema;
            Schemas.Remove(schema.Id);
        }
    }

    private sealed class FakeUnitOfWork : IUnitOfWork<ClassificationBoundary>
    {
        public int SavedChangesCount { get; private set; }
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SavedChangesCount++;
            return Task.FromResult(1);
        }
    }

    [TestMethod]
    public async Task DeleteMetadataSchema_DraftSchema_Succeeds()
    {
        var repo = new FakeClassificationRepository();
        var uow = new FakeUnitOfWork();
        var handler = new MetadataSchemaManagementHandlers(repo, uow);

        var schema = MetadataSchema.Create("taslak-sema", "Taslak Şema", 1, Now);
        schema.AddField("alan1", "Alan 1", MetadataFieldType.Text, false, true, false, null);
        await repo.AddSchemaAsync(schema, CancellationToken.None);

        var result = await handler.Handle(new DeleteMetadataSchemaCommand(schema.Id.Value), CancellationToken.None);

        Assert.IsTrue(result.IsSuccess);
        Assert.AreEqual(schema, repo.RemovedSchema);
        Assert.AreEqual(1, uow.SavedChangesCount);
        Assert.IsFalse(repo.Schemas.ContainsKey(schema.Id));
    }

    [TestMethod]
    public async Task DeleteMetadataSchema_PublishedSchemaInUse_ReturnsConflict()
    {
        var repo = new FakeClassificationRepository { HasDocumentMetadataResult = true };
        var uow = new FakeUnitOfWork();
        var handler = new MetadataSchemaManagementHandlers(repo, uow);

        var schema = MetadataSchema.Create("yayim-sema", "Yayımlanmış Şema", 1, Now);
        schema.AddField("alan1", "Alan 1", MetadataFieldType.Text, false, true, false, null);
        schema.Publish(Now);
        await repo.AddSchemaAsync(schema, CancellationToken.None);

        var result = await handler.Handle(new DeleteMetadataSchemaCommand(schema.Id.Value), CancellationToken.None);

        Assert.IsTrue(result.IsFailure);
        Assert.AreEqual(ErrorType.Conflict, result.Error.Type);
        Assert.IsNull(repo.RemovedSchema);
        Assert.AreEqual(0, uow.SavedChangesCount);
    }

    [TestMethod]
    public async Task DeleteMetadataSchema_PublishedSchemaNotInUse_Succeeds()
    {
        var repo = new FakeClassificationRepository { HasDocumentMetadataResult = false };
        var uow = new FakeUnitOfWork();
        var handler = new MetadataSchemaManagementHandlers(repo, uow);

        var schema = MetadataSchema.Create("yayim-sema", "Yayımlanmış Şema", 1, Now);
        schema.AddField("alan1", "Alan 1", MetadataFieldType.Text, false, true, false, null);
        schema.Publish(Now);
        await repo.AddSchemaAsync(schema, CancellationToken.None);

        var result = await handler.Handle(new DeleteMetadataSchemaCommand(schema.Id.Value), CancellationToken.None);

        Assert.IsTrue(result.IsSuccess);
        Assert.AreEqual(schema, repo.RemovedSchema);
        Assert.AreEqual(1, uow.SavedChangesCount);
    }

    [TestMethod]
    public async Task RevertMetadataSchemaToDraft_NotInUse_Succeeds()
    {
        var repo = new FakeClassificationRepository { HasDocumentMetadataResult = false };
        var uow = new FakeUnitOfWork();
        var handler = new MetadataSchemaManagementHandlers(repo, uow);

        var schema = MetadataSchema.Create("yayim-sema", "Yayımlanmış Şema", 1, Now);
        schema.AddField("alan1", "Alan 1", MetadataFieldType.Text, false, true, false, null);
        schema.Publish(Now);
        await repo.AddSchemaAsync(schema, CancellationToken.None);

        var result = await handler.Handle(new RevertMetadataSchemaToDraftCommand(schema.Id.Value), CancellationToken.None);

        Assert.IsTrue(result.IsSuccess);
        Assert.AreEqual(MetadataSchemaStatus.Draft, schema.Status);
        Assert.AreEqual(1, uow.SavedChangesCount);
    }

    [TestMethod]
    public async Task RevertMetadataSchemaToDraft_InUse_ReturnsConflict()
    {
        var repo = new FakeClassificationRepository { HasDocumentMetadataResult = true };
        var uow = new FakeUnitOfWork();
        var handler = new MetadataSchemaManagementHandlers(repo, uow);

        var schema = MetadataSchema.Create("yayim-sema", "Yayımlanmış Şema", 1, Now);
        schema.AddField("alan1", "Alan 1", MetadataFieldType.Text, false, true, false, null);
        schema.Publish(Now);
        await repo.AddSchemaAsync(schema, CancellationToken.None);

        var result = await handler.Handle(new RevertMetadataSchemaToDraftCommand(schema.Id.Value), CancellationToken.None);

        Assert.IsTrue(result.IsFailure);
        Assert.AreEqual(ErrorType.Conflict, result.Error.Type);
        Assert.AreEqual(MetadataSchemaStatus.Published, schema.Status);
    }

    [TestMethod]
    public async Task UpdateMetadataField_OnPublishedSchema_UpdatesLabelSuccessfully()
    {
        var repo = new FakeClassificationRepository();
        var uow = new FakeUnitOfWork();
        var handler = new MetadataSchemaManagementHandlers(repo, uow);

        var schema = MetadataSchema.Create("yayim-sema", "Yayımlanmış Şema", 1, Now);
        var f1 = schema.AddField("alan1", "Eski Ad", MetadataFieldType.Text, false, true, false, null);
        schema.Publish(Now);
        await repo.AddSchemaAsync(schema, CancellationToken.None);

        var result = await handler.Handle(new UpdateMetadataFieldCommand(
            schema.Id.Value, f1.Id, "Yeni Başlık", "Text", false, true, false, null), CancellationToken.None);

        Assert.IsTrue(result.IsSuccess);
        Assert.AreEqual("Yeni Başlık", f1.Label);
        Assert.AreEqual(1, uow.SavedChangesCount);
    }
}
