using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Retention.Application;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Application.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Cases;
using Mbb.Archive.Modules.Retention.Domain.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Rules;
using Mbb.Archive.Modules.Retention.Contracts;
using Mbb.Archive.Modules.PhysicalArchive.Contracts;

namespace Mbb.Archive.Modules.Retention.UnitTests;

internal sealed class RetentionFixture : IRetentionRepository, IDispositionRepository,
    IInbox<RetentionBoundary>, IOutbox<RetentionBoundary>, IUnitOfWork<RetentionBoundary>, ICurrentUserPermissions, IDocumentVisibility, IArchiveTransferSource, IPhysicalDispositionGateway
{
    public List<RetentionRule> Rules { get; } = [];
    public List<RetentionCase> Cases { get; } = [];
    public List<LegalHold> Holds { get; } = [];
    public List<DispositionProcess> Processes { get; } = [];
    public List<IIntegrationEvent> Events { get; } = [];
    public HashSet<Guid> Inbox { get; } = [];
    public string Subject { get; set; } = "preparer";
    public IReadOnlyCollection<string> Groups { get; set; } = [];
    public int Saves { get; private set; }
    public DispositionCommandHandler Handler => new(this, this, this, this, this, TimeProvider.System, this, this, this);
    public Task AddRuleAsync(RetentionRule rule, CancellationToken ct) { Rules.Add(rule); return Task.CompletedTask; }
    public Task<RetentionRule?> GetRuleByCodeAsync(string code, CancellationToken ct) => Task.FromResult(Rules.SingleOrDefault(x => x.Code == code));
    public Task AddCaseAsync(RetentionCase item, CancellationToken ct) { Cases.Add(item); return Task.CompletedTask; }
    public Task<RetentionCase?> GetCaseAsync(Guid id, CancellationToken ct) => Task.FromResult(Cases.SingleOrDefault(x => x.Id == id));
    public Task<RetentionCase?> GetCaseByRecordAsync(Guid id, CancellationToken ct) => Task.FromResult(Cases.SingleOrDefault(x => x.ArchiveRecordId == id));
    public Task AddHoldAsync(LegalHold hold, CancellationToken ct) { Holds.Add(hold); return Task.CompletedTask; }
    public Task<LegalHold?> GetHoldAsync(Guid id, CancellationToken ct) => Task.FromResult(Holds.SingleOrDefault(x => x.Id == id));
    public Task<IReadOnlyList<LegalHold>> GetActiveHoldsAsync(Guid id, CancellationToken ct) => Task.FromResult<IReadOnlyList<LegalHold>>(Holds.Where(x => x.RetentionCaseId == id && x.IsActive).ToArray());
    public Task<IReadOnlyList<RetentionCase>> GetDueCasesAsync(DateTimeOffset now, int limit, CancellationToken ct) => Task.FromResult<IReadOnlyList<RetentionCase>>(Cases);
    public Task<DispositionProcess?> GetAsync(Guid id, CancellationToken ct) => Task.FromResult(Processes.SingleOrDefault(x => x.Id == id));
    public Task<bool> HasOpenProcessAsync(Guid id, CancellationToken ct) => Task.FromResult(Processes.Any(x => x.RetentionCaseId == id && x.Status is not DispositionProcessStatus.Completed and not DispositionProcessStatus.Rejected));
    public Task AddAsync(DispositionProcess process, CancellationToken ct) { Processes.Add(process); return Task.CompletedTask; }
    public Task<PagedResult<DispositionProcess>> ListAsync(PageRequest page, string? status, CancellationToken ct) => Task.FromResult(new PagedResult<DispositionProcess>(Processes, page.Page, page.PageSize, Processes.Count));
    public Task<bool> HasProcessedAsync(Guid id, CancellationToken ct) => Task.FromResult(Inbox.Contains(id));
    public void MarkProcessed(Guid id, string name, DateTimeOffset at) => Inbox.Add(id);
    public void Enqueue(IIntegrationEvent integrationEvent) => Events.Add(integrationEvent);
    public Task<int> SaveChangesAsync(CancellationToken ct = default) { Saves++; return Task.FromResult(1); }
    public Task<bool> HasAllPermissionsAsync(CancellationToken ct) => Task.FromResult(false);
    public Task<IReadOnlyCollection<string>> GetAsync(CancellationToken ct) => Task.FromResult<IReadOnlyCollection<string>>([]);
    public HashSet<Guid> Hidden { get; } = [];
    public Dictionary<Guid, ArchiveTransferSourceDocument> Sources { get; } = [];
    public Dictionary<Guid, byte[]> Originals { get; } = [];
    public int PhysicalRecords { get; private set; }
    public Task<IReadOnlySet<Guid>> FilterAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct)
        => Task.FromResult<IReadOnlySet<Guid>>(ids.Where(x => !Hidden.Contains(x)).ToHashSet());
    Task<ArchiveTransferSourceDocument?> IArchiveTransferSource.GetAsync(Guid id, CancellationToken ct)
        => Task.FromResult(Hidden.Contains(id) ? null : Sources.GetValueOrDefault(id));
    public Task<Stream?> OpenOriginalAsync(Guid id, Guid versionId, CancellationToken ct)
        => Task.FromResult<Stream?>(Hidden.Contains(id) || !Originals.TryGetValue(versionId, out var bytes) ? null : new MemoryStream(bytes));
    public Task<Result> RecordAsync(Guid documentId, Guid processId, string actor, string reference, Guid evidenceId, DateTimeOffset at, CancellationToken ct)
    { PhysicalRecords++; return Task.FromResult(Result.Success()); }
    public RetentionCase AddEligibleCase()
    {
        var now = DateTimeOffset.UtcNow;
        var rule = RetentionRule.Create("R1", "Devir", 1, DispositionAction.Transfer, now.AddYears(-1)); Rules.Add(rule);
        var item = RetentionCase.Schedule(Guid.NewGuid(), Guid.NewGuid(), rule, now.AddMonths(-2)); Cases.Add(item);
        return item;
    }
}
