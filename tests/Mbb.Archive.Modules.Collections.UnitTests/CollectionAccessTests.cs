using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Collections.Application;
using Mbb.Archive.Modules.Collections.Application.Abstractions;
using Mbb.Archive.Modules.Collections.Application.Collections;
using Mbb.Archive.Modules.Collections.Domain.Collections;
namespace Mbb.Archive.Modules.Collections.UnitTests;
[TestClass]
public sealed class CollectionAccessTests
{
    [TestMethod]
    public async Task InvisibleDocumentIsRejectedWithoutWriting()
    {
        var store = new Store();
        var handler = new CollectionCommandHandlers(store, store, new User(), TimeProvider.System, new Visibility(false));
        var result = await handler.Handle(new AddDocumentToCollectionCommand(store.Collection.Id.Value, Guid.NewGuid()), default);
        Assert.IsTrue(result.IsFailure); Assert.AreEqual(0, store.Saves); Assert.AreEqual(0, store.Collection.Items.Count);
    }
    [TestMethod]
    public async Task VisibleDocumentIsAddedToOwnedCollection()
    {
        var store = new Store(); var id = Guid.NewGuid();
        var handler = new CollectionCommandHandlers(store, store, new User(), TimeProvider.System, new Visibility(true));
        var result = await handler.Handle(new AddDocumentToCollectionCommand(store.Collection.Id.Value, id), default);
        Assert.IsTrue(result.IsSuccess); Assert.AreEqual(1, store.Saves); Assert.AreEqual(1, store.Collection.Items.Count);
    }
    private sealed class Visibility(bool visible) : IDocumentVisibility
    { public Task<IReadOnlySet<Guid>> FilterAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct) => Task.FromResult<IReadOnlySet<Guid>>(visible ? ids.ToHashSet() : new HashSet<Guid>()); }
    private sealed class User : ICurrentUserPermissions
    {
        public string Subject => "owner"; public IReadOnlyCollection<string> Groups => [];
        public Task<bool> HasAllPermissionsAsync(CancellationToken ct) => Task.FromResult(false);
        public Task<IReadOnlyCollection<string>> GetAsync(CancellationToken ct) => Task.FromResult<IReadOnlyCollection<string>>(["collections.manage"]);
    }
    private sealed class Store : ICollectionRepository, IUnitOfWork<CollectionsBoundary>
    {
        public DocumentCollection Collection { get; } = DocumentCollection.Create("Test", null, "owner", false, DateTimeOffset.UtcNow);
        public int Saves { get; private set; }
        public Task AddAsync(DocumentCollection collection, CancellationToken ct) => Task.CompletedTask;
        public Task<DocumentCollection?> GetAsync(DocumentCollectionId id, CancellationToken ct) => Task.FromResult<DocumentCollection?>(Collection);
        public void Remove(DocumentCollection collection) { }
        public Task<int> SaveChangesAsync(CancellationToken ct = default) { Saves++; return Task.FromResult(1); }
    }
}
