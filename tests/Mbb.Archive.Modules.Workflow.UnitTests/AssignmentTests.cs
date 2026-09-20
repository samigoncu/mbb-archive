using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Workflow.Application;
using Mbb.Archive.Modules.Workflow.Domain.Definitions;
using Mbb.Archive.Modules.Workflow.Domain.Instances;

namespace Mbb.Archive.Modules.Workflow.UnitTests;
[TestClass]
public sealed class AssignmentTests
{
    [TestMethod]
    public async Task CreateAssignAndComplete_RequiresAssignedUserAndVisibility()
    {
        var store = new Store(); var user = new User(); var directory = new Directory(); var visible = new Visibility();
        var runtime = new WorkflowRuntime(new WorkflowConditionEvaluator(), store);
        var handler = new WorkflowAssignmentHandler(store, store, directory, user, runtime, TimeProvider.System, store);
        var created = await handler.CreateAsync(new(Guid.NewGuid(), "Kontrol", "worker", 60), default);
        Assert.IsTrue(created.IsSuccess);
        var item = store.Instance!.WorkItems.Single();
        Assert.AreEqual("worker", item.AssigneeSubjectId);
        Assert.AreEqual(1, store.Events.Count);
        var commands = new WorkflowCommandHandlers(store, store, runtime, store, TimeProvider.System, user, visible);
        var denied = await commands.Handle(new CompleteWorkflowTaskCommand(store.Instance.Id, "manager", "done", new Dictionary<string,string>()), default);
        Assert.IsTrue(denied.IsFailure);
        Assert.AreEqual(WorkflowWorkItemStatus.Open, item.Status);
        user.Subject = "worker"; visible.Allowed = false;
        Assert.IsTrue((await commands.Handle(new CompleteWorkflowTaskCommand(store.Instance.Id, "worker", "done", new Dictionary<string,string>()), default)).IsFailure);
        visible.Allowed = true;
        Assert.IsTrue((await commands.Handle(new CompleteWorkflowTaskCommand(store.Instance.Id, "worker", "done", new Dictionary<string,string>()), default)).IsSuccess);
        Assert.AreEqual(WorkflowInstanceStatus.Completed, store.Instance.Status);
    }
    [TestMethod]
    public async Task AssignmentRejectsOutsideUnitStaleAndClosedTasks()
    {
        var store = new Store(); var user = new User(); var directory = new Directory();
        var runtime = new WorkflowRuntime(new WorkflowConditionEvaluator(), store);
        var handler = new WorkflowAssignmentHandler(store, store, directory, user, runtime, TimeProvider.System, store);
        Assert.IsTrue((await handler.CreateAsync(new(Guid.NewGuid(), "Test", "outsider", 60), default)).IsFailure);
        Assert.IsNull(store.Instance);
        await handler.CreateAsync(new(Guid.NewGuid(), "Test", "worker", 60), default);
        var instance = store.Instance!; var item = instance.WorkItems.Single(); var version = instance.ConcurrencyVersion;
        Assert.IsTrue((await handler.AssignAsync(instance.Id, new(item.Id,"other",version),default)).IsSuccess);
        Assert.AreEqual("other", item.AssigneeSubjectId);
        Assert.IsTrue((await handler.AssignAsync(instance.Id,new(item.Id,"worker",version),default)).IsFailure);
        Assert.AreEqual("other", item.AssigneeSubjectId);
        instance.CompleteCurrentTask("other","done",new Dictionary<string,string>(),DateTimeOffset.UtcNow);
        Assert.IsTrue((await handler.AssignAsync(instance.Id,new(item.Id,"worker",instance.ConcurrencyVersion),default)).IsFailure);
    }
    private sealed class Directory : IWorkflowAssignmentDirectory
    {
        public Task<IReadOnlyList<WorkflowAssignee>> GetCandidatesAsync(Guid id,CancellationToken ct,string? permission=null)
            => Task.FromResult<IReadOnlyList<WorkflowAssignee>>([new("worker","Birim"),new("other","Birim")]);
    }
    private sealed class User : ICurrentUserPermissions
    {
        public string Subject {get;set;}="manager";
        public IReadOnlyCollection<string> Groups => [];
        public Task<bool> HasAllPermissionsAsync(CancellationToken ct)=>Task.FromResult(true);
        public Task<IReadOnlyCollection<string>> GetAsync(CancellationToken ct)=>Task.FromResult<IReadOnlyCollection<string>>([]);
    }
    private sealed class Visibility : IDocumentVisibility
    {
        public bool Allowed=true;
        public Task<IReadOnlySet<Guid>> FilterAsync(IReadOnlyCollection<Guid> ids,CancellationToken ct)=>Task.FromResult<IReadOnlySet<Guid>>(Allowed?ids.ToHashSet():new HashSet<Guid>());
    }
    private sealed class Store : IWorkflowRepository,IUnitOfWork<WorkflowBoundary>,IOutbox<WorkflowBoundary>
    {
        public WorkflowInstance? Instance; public WorkflowDefinition? Definition;
        public List<IIntegrationEvent> Events=[];
        public void Enqueue(IIntegrationEvent e)=>Events.Add(e);
        public Task<int> SaveChangesAsync(CancellationToken ct=default)=>Task.FromResult(1);
        public Task AddDefinitionAsync(WorkflowDefinition d,CancellationToken ct){Definition=d;return Task.CompletedTask;}
        public Task<WorkflowDefinition?> GetDefinitionAsync(Guid id,CancellationToken ct)=>Task.FromResult(Definition);
        public Task AddInstanceAsync(WorkflowInstance i,CancellationToken ct){Instance=i;return Task.CompletedTask;}
        public Task<WorkflowInstance?> GetInstanceAsync(Guid id,CancellationToken ct)=>Task.FromResult(Instance);
        public Task<IReadOnlyList<Guid>> GetDueTimerInstanceIdsAsync(DateTimeOffset now,int take,CancellationToken ct)=>Task.FromResult<IReadOnlyList<Guid>>([]);
        public Task<IReadOnlyList<Guid>> GetOverdueTaskInstanceIdsAsync(DateTimeOffset now,int take,CancellationToken ct)=>Task.FromResult<IReadOnlyList<Guid>>([]);
    }
}
