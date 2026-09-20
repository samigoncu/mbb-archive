using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Archive.Application.Abstractions;
using Mbb.Archive.Modules.Archive.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Archive.Domain.Records;
using Mbb.Archive.Modules.Classification.Contracts;
using Mbb.Archive.Modules.Retention.Contracts;
using Mbb.Archive.BuildingBlocks.Application.Security;

namespace Mbb.Archive.Modules.Archive.Application.Records.Declare;

public sealed class DeclareArchiveRecordCommandHandler(
    IArchiveRecordRepository records,
    IOutbox<ArchiveBoundary> outbox,
    IUnitOfWork<ArchiveBoundary> unitOfWork,
    TimeProvider time,
    IFilePlanCatalog filePlans,
    IRetentionRuleCatalog retentionRules,
    IDocumentVisibility visibility) : ICommandHandler<DeclareArchiveRecordCommand>
{
    public async Task<Result> Handle(DeclareArchiveRecordCommand command, CancellationToken ct)
    {
        var record = await records.GetAsync(new ArchiveRecordId(command.RecordId), ct);
        if (record is null || !(await visibility.FilterAsync([record.DocumentId], ct)).Contains(record.DocumentId))
            return Result.Failure(Error.NotFound("archive.record_not_found", "Arşiv kaydı bulunamadı."));

        var classification = command.ClassificationCode?.Trim() ?? "";
        var rule = command.RetentionRuleCode?.Trim() ?? "";
        var now = time.GetUtcNow();
        try
        {
            // Replay preserves the original declaration even after its file plan expires.
            if (record.Status == ArchiveRecordStatus.Declared)
            {
                record.Declare(classification, rule, now);
                return Result.Success();
            }
            if (!await filePlans.IsSelectableAsync(classification, DateOnly.FromDateTime(now.UtcDateTime), ct))
                return Result.Failure(Error.Validation("archive.invalid_classification", "Geçerli ve seçilebilir bir dosya planı kodu gereklidir."));
            if (!await retentionRules.ExistsAsync(rule, ct))
                return Result.Failure(Error.Validation("archive.invalid_retention_rule", "Saklama kuralı bulunamadı."));

            record.Declare(classification, rule, now);
            outbox.Enqueue(new ArchiveRecordDeclaredIntegrationEvent(
                Guid.CreateVersion7(), record.Id.Value, record.DocumentId, record.DocumentVersionId,
                record.ClassificationCode!, record.RetentionRuleCode!, record.OriginalStorageKey,
                record.Sha256Hash, now, now, command.DeclaredBy));
            await unitOfWork.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (DomainRuleViolationException exception)
        {
            return Result.Failure(Error.Conflict("archive.declaration_conflict", exception.Message));
        }
    }
}
