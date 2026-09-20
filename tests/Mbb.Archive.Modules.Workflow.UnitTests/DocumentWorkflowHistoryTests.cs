using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Workflow.Application;
namespace Mbb.Archive.Modules.Workflow.UnitTests;

[TestClass]
public sealed class DocumentWorkflowHistoryTests
{
    [TestMethod]
    public async Task InvisibleDocumentNeverQueriesHistory()
    {
        var store = new Store(); var handler = new DocumentWorkflowHistoryHandler(store, new Visibility(false));
        var result = await handler.Handle(Guid.NewGuid(), PageRequest.Create(1, 25).Value, default);
        Assert.AreEqual(ErrorType.NotFound, result.Error.Type); Assert.AreEqual(0, store.Calls);
    }
    [TestMethod]
    public async Task VisibleHistoryPreservesCompletedActorOutcomeAndPagination()
    {
        var store = new Store(); var result = await new DocumentWorkflowHistoryHandler(store, new Visibility(true)).Handle(Guid.NewGuid(), PageRequest.Create(2, 25).Value, default);
        Assert.IsTrue(result.IsSuccess); Assert.AreEqual(2, result.Value.Page); Assert.AreEqual(27L, result.Value.TotalCount);
        Assert.AreEqual("reviewer", result.Value.Items.Single().CompletedBy); Assert.AreEqual("approved", result.Value.Items.Single().Outcome);
    }
    private sealed class Visibility(bool allowed) : IDocumentVisibility
    { public Task<IReadOnlySet<Guid>> FilterAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct) => Task.FromResult<IReadOnlySet<Guid>>(allowed ? ids.ToHashSet() : new HashSet<Guid>()); }
    private sealed class Store : IWorkflowQueries
    {
        public int Calls;
        public Task<PagedResult<DocumentWorkflowItem>> GetDocumentHistoryAsync(Guid id, PageRequest page, CancellationToken ct)
        { Calls++; return Task.FromResult(new PagedResult<DocumentWorkflowItem>([new(Guid.NewGuid(), Guid.NewGuid(), "Kontrol", "Onay", "Completed", "Completed", DateTimeOffset.UtcNow, null, "reviewer", "manager", DateTimeOffset.UtcNow, "reviewer", DateTimeOffset.UtcNow, "approved", 0)], page.Page, page.PageSize, 27)); }
        public Task<IReadOnlyList<WorkflowWorkItemListItem>> GetWorkItemsAsync(string? status, IReadOnlyCollection<string>? permissions, string? assignee, DateTimeOffset now, int take, CancellationToken ct) => throw new NotSupportedException();
        public Task<IReadOnlyList<WorkflowWorkItemListItem>> GetOpenWorkItemsAsync(IReadOnlyCollection<string>? permissions, string? assignee, DateTimeOffset now, int take, CancellationToken ct) => throw new NotSupportedException();
    }
}
