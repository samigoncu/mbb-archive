using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;

namespace Mbb.Archive.Modules.Workflow.Application;

/// <summary>
/// Bir iş kaleminin künyesi. Hangi izne bağlı olduğu görünür kalır; kullanıcı
/// neden bir görevi göremediğini anlayabilsin diye.
/// </summary>
public sealed record WorkflowWorkItemListItem(
    Guid Id,
    Guid InstanceId,
    Guid DefinitionId,
    string DefinitionName,
    Guid DocumentId,
    string NodeName,
    string Permission,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? DueAt,
    bool IsOverdue,
    string? AssigneeSubjectId = null,
    long Version = 0,
    bool IsManual = false,
    string? CompletedBy = null,
    DateTimeOffset? CompletedAt = null,
    string? Outcome = null,
    string? AssignedBy = null,
    DateTimeOffset? AssignedAt = null);

public interface IWorkflowQueries
{
    Task<PagedResult<DocumentWorkflowItem>> GetDocumentHistoryAsync(Guid documentId, PageRequest page, CancellationToken ct);
    Task<IReadOnlyList<WorkflowWorkItemListItem>> GetWorkItemsAsync(
        string? status,
        IReadOnlyCollection<string>? permissions,
        string? assigneeSubject,
        DateTimeOffset now,
        int take,
        CancellationToken cancellationToken);
    Task<IReadOnlyList<WorkflowWorkItemListItem>> GetOpenWorkItemsAsync(
        IReadOnlyCollection<string>? permissions,
        string? assigneeSubject,
        DateTimeOffset now,
        int take,
        CancellationToken cancellationToken)
        => GetWorkItemsAsync("open", permissions, assigneeSubject, now, take, cancellationToken);
}

public sealed record DocumentWorkflowItem(Guid Id, Guid InstanceId, string DefinitionName, string NodeName,
    string InstanceStatus, string Status, DateTimeOffset CreatedAt, DateTimeOffset? DueAt,
    string? AssigneeSubjectId, string? AssignedBy, DateTimeOffset? AssignedAt,
    string? CompletedBy, DateTimeOffset? CompletedAt, string? Outcome, int EscalationLevel);

public sealed class DocumentWorkflowHistoryHandler(IWorkflowQueries queries, IDocumentVisibility visibility)
{
    public async Task<Result<PagedResult<DocumentWorkflowItem>>> Handle(Guid documentId, PageRequest page, CancellationToken ct)
    {
        if (!(await visibility.FilterAsync([documentId], ct)).Contains(documentId))
            return Result<PagedResult<DocumentWorkflowItem>>.Failure(Error.NotFound("workflow.document_missing", "Belge bulunamadı."));
        return Result<PagedResult<DocumentWorkflowItem>>.Success(await queries.GetDocumentHistoryAsync(documentId, page, ct));
    }
}

public sealed record GetMyWorkItemsQuery(int Take = 100, string? Status = "all")
    : IQuery<IReadOnlyList<WorkflowWorkItemListItem>>;

/// <summary>
/// "Görevlerim" yalnız çağıranın gerçekten yetkili olduğu iş kalemlerini
/// döndürür. Süzgeç istemciden gelen bir parametreye değil, sunucuda çözülen
/// etkin izinlere dayanır (§21).
/// </summary>
public sealed class GetMyWorkItemsQueryHandler
    : IQueryHandler<GetMyWorkItemsQuery, IReadOnlyList<WorkflowWorkItemListItem>>
{
    private readonly IWorkflowQueries _queries;
    private readonly ICurrentUserPermissions _permissions;
    private readonly TimeProvider _timeProvider;
    private readonly IDocumentVisibility _visibility;

    public GetMyWorkItemsQueryHandler(
        IWorkflowQueries queries,
        ICurrentUserPermissions permissions,
        TimeProvider timeProvider, IDocumentVisibility visibility)
    {
        _queries = queries;
        _permissions = permissions;
        _timeProvider = timeProvider;
        _visibility = visibility;
    }

    public async Task<Result<IReadOnlyList<WorkflowWorkItemListItem>>> Handle(
        GetMyWorkItemsQuery query,
        CancellationToken cancellationToken)
    {
        var unrestricted = await _permissions.HasAllPermissionsAsync(cancellationToken);

        var effective = unrestricted
            ? null
            : await _permissions.GetAsync(cancellationToken);

        var manager = unrestricted || effective!.Contains("workflow.manage");
        var items = await _queries.GetWorkItemsAsync(
            query.Status,
            manager ? null : effective,
            manager ? null : _permissions.Subject,
            _timeProvider.GetUtcNow(),
            Math.Clamp(query.Take, 1, 500),
            cancellationToken);

        var visible = await _visibility.FilterAsync(items.Select(item => item.DocumentId).Distinct().ToArray(), cancellationToken);
        return Result<IReadOnlyList<WorkflowWorkItemListItem>>.Success(items.Where(item => visible.Contains(item.DocumentId)
            && (manager || item.AssigneeSubjectId is null || item.AssigneeSubjectId == _permissions.Subject || item.CompletedBy == _permissions.Subject)).ToArray());
    }
}
