using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Domain.Cases;

namespace Mbb.Archive.Modules.Retention.Application.Cases.Schedule;

public sealed class ScheduleRetentionCaseCommandHandler(
    IRetentionRepository repository,
    IInbox<RetentionBoundary> inbox,
    IUnitOfWork<RetentionBoundary> unitOfWork) : ICommandHandler<ScheduleRetentionCaseCommand, Guid>
{
    public async Task<Result<Guid>> Handle(ScheduleRetentionCaseCommand command, CancellationToken ct)
    {
        var existing = await repository.GetCaseByRecordAsync(command.ArchiveRecordId, ct);
        if (existing is not null)
        {
            // PostgreSQL timestamps retain microseconds; event JSON can retain 100ns ticks.
            if (existing.DocumentId != command.DocumentId || existing.RuleCode != command.RuleCode
                || existing.TriggerAt.UtcTicks / 10 != command.DeclaredAt.UtcTicks / 10)
                return Result<Guid>.Failure(Error.Conflict("retention.declaration_mismatch", "Bu kaydın mevcut saklama beyanı farklıdır."));
            if (!await inbox.HasProcessedAsync(command.MessageId, ct))
            {
                inbox.MarkProcessed(command.MessageId, command.EventName, command.DeclaredAt);
                await unitOfWork.SaveChangesAsync(ct);
            }
            return Result<Guid>.Success(existing.Id);
        }
        if (await inbox.HasProcessedAsync(command.MessageId, ct))
            return Result<Guid>.Failure(Error.Conflict("retention.message_processed", "İşlenmiş mesajın saklama kaydı bulunamadı."));
        var rule = await repository.GetRuleByCodeAsync(command.RuleCode, ct);
        if (rule is null)
            return Result<Guid>.Failure(Error.NotFound("retention.rule_not_found", "Saklama kuralı bulunamadı."));
        var item = RetentionCase.Schedule(command.ArchiveRecordId, command.DocumentId, rule, command.DeclaredAt);
        await repository.AddCaseAsync(item, ct);
        inbox.MarkProcessed(command.MessageId, command.EventName, command.DeclaredAt);
        await unitOfWork.SaveChangesAsync(ct);
        return Result<Guid>.Success(item.Id);
    }
}
