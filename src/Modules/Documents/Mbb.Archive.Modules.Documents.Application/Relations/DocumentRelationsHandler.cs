using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Relations;
namespace Mbb.Archive.Modules.Documents.Application.Relations;

public interface IDocumentRelations
{
    Task<IReadOnlyList<DocumentRelation>> ListAsync(Guid documentId, CancellationToken ct);
    Task<DocumentRelation?> GetAsync(Guid id, CancellationToken ct);
    Task<bool> ExistsAsync(Guid source, Guid target, string kind, Guid? except, CancellationToken ct);
    Task AddAsync(DocumentRelation relation, CancellationToken ct);
}
public sealed record ChangeRelation(Guid TargetDocumentId, string Kind, string Note, long ExpectedVersion);
public sealed record RelationItem(Guid Id, Guid SourceDocumentId, Guid TargetDocumentId, string Kind, string Note,
    string CreatedBy, DateTimeOffset CreatedAt, string ModifiedBy, DateTimeOffset ModifiedAt, long Version, bool CanManage);
public sealed record DocumentRelationChanged(Guid EventId, Guid DocumentId, Guid RelatedDocumentId, Guid RelationId,
    string Operation, string Kind, string Note, string Actor, DateTimeOffset OccurredAt) : IIntegrationEvent
{ public string EventName => "documents.relation-changed.v1"; }

public sealed class DocumentRelationsHandler(IDocumentRelations store, IArchiveFilingCatalog documents,
    IArchiveUnitDirectory units, IDocumentVisibility visibility, ICurrentUserPermissions user,
    IUnitOfWork<DocumentsBoundary> uow, IOutbox<DocumentsBoundary> outbox, TimeProvider time)
{
    private async Task<bool> Writable(Guid id, CancellationToken ct)
    {
        var document = await documents.GetDocumentAsync(id, ct);
        return document?.OwnerUnitId is Guid unit && await units.ResolveWritableAsync(unit, "documents.manage.all", ct) is not null;
    }
    public async Task<Result<IReadOnlyList<RelationItem>>> List(Guid id, CancellationToken ct)
    {
        if (!(await visibility.FilterAsync([id], ct)).Contains(id))
            return Result<IReadOnlyList<RelationItem>>.Failure(Missing());
        var relations = await store.ListAsync(id, ct);
        var visible = await visibility.FilterAsync(relations.SelectMany(x => new[] { x.SourceDocumentId, x.TargetDocumentId }).Distinct().ToArray(), ct);
        var canManage = await user.HasAllPermissionsAsync(ct) || (await user.GetAsync(ct)).Contains("documents.write");
        var writable = canManage && await Writable(id, ct);
        return Result<IReadOnlyList<RelationItem>>.Success(relations.Where(x => visible.Contains(x.SourceDocumentId) && visible.Contains(x.TargetDocumentId))
            .Select(x => new RelationItem(x.Id, x.SourceDocumentId, x.TargetDocumentId, x.Kind, x.Note, x.CreatedBy, x.CreatedAt,
                x.ModifiedBy, x.ModifiedAt, x.Version, writable && x.SourceDocumentId == id)).ToArray());
    }
    public async Task<Result<Guid>> Create(Guid id, ChangeRelation request, CancellationToken ct)
    {
        if (!await Writable(id, ct) || !(await visibility.FilterAsync([request.TargetDocumentId], ct)).Contains(request.TargetDocumentId))
            return Result<Guid>.Failure(Missing());
        if (await store.ExistsAsync(id, request.TargetDocumentId, request.Kind, null, ct))
            return Result<Guid>.Failure(Error.Conflict("relations.duplicate", "Bu ilişki zaten var."));
        try
        {
            var item = DocumentRelation.Create(id, request.TargetDocumentId, request.Kind, request.Note, user.Subject, time.GetUtcNow());
            await store.AddAsync(item, ct); Audit(item, "created", item.Note); await uow.SaveChangesAsync(ct);
            return Result<Guid>.Success(item.Id);
        }
        catch (DomainRuleViolationException ex) { return Result<Guid>.Failure(Error.Validation("relations.invalid", ex.Message)); }
    }
    public async Task<Result> Update(Guid documentId, Guid relationId, ChangeRelation request, CancellationToken ct)
    {
        var item = await store.GetAsync(relationId, ct);
        if (item is null || item.SourceDocumentId != documentId || !await Writable(documentId, ct)
            || !(await visibility.FilterAsync([item.TargetDocumentId], ct)).Contains(item.TargetDocumentId)) return Result.Failure(Missing());
        if (request.TargetDocumentId != item.TargetDocumentId) return Result.Failure(Error.Validation("relations.target_fixed", "Hedef belge değiştirilemez; ilişkiyi kaldırıp yeni ilişki oluşturun."));
        if (await store.ExistsAsync(documentId, item.TargetDocumentId, request.Kind, relationId, ct))
            return Result.Failure(Error.Conflict("relations.duplicate", "Bu ilişki zaten var."));
        try { item.Change(request.Kind, request.Note, request.ExpectedVersion, user.Subject, time.GetUtcNow()); }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Conflict("relations.conflict", ex.Message)); }
        Audit(item, "updated", item.Note); await uow.SaveChangesAsync(ct); return Result.Success();
    }
    public async Task<Result> Remove(Guid documentId, Guid relationId, long expectedVersion, string reason, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 1000) return Result.Failure(Error.Validation("relations.reason", "Kaldırma gerekçesi gerekir (en fazla 1000 karakter)."));
        var item = await store.GetAsync(relationId, ct);
        if (item is null || item.SourceDocumentId != documentId || !await Writable(documentId, ct)
            || !(await visibility.FilterAsync([item.TargetDocumentId], ct)).Contains(item.TargetDocumentId)) return Result.Failure(Missing());
        try { item.Remove(expectedVersion, user.Subject, time.GetUtcNow()); }
        catch (DomainRuleViolationException ex) { return Result.Failure(Error.Conflict("relations.conflict", ex.Message)); }
        Audit(item, "removed", reason.Trim()); await uow.SaveChangesAsync(ct); return Result.Success();
    }
    private void Audit(DocumentRelation item, string operation, string note) => outbox.Enqueue(new DocumentRelationChanged(Guid.CreateVersion7(), item.SourceDocumentId,
        item.TargetDocumentId, item.Id, operation, item.Kind, note, user.Subject, time.GetUtcNow()));
    private static Error Missing() => Error.NotFound("relations.missing", "İlişki veya yetkiniz olan belge bulunamadı.");
}
