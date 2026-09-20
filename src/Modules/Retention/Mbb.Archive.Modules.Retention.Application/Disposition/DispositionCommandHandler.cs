using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Retention.Application.Abstractions;
using Mbb.Archive.Modules.Retention.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Retention.Domain.Disposition;
using Mbb.Archive.Modules.Retention.Contracts;
using Mbb.Archive.Modules.PhysicalArchive.Contracts;

namespace Mbb.Archive.Modules.Retention.Application.Disposition;

public sealed class DispositionCommandHandler(IDispositionRepository processes, IRetentionRepository cases,
    ICurrentUserPermissions user, IOutbox<RetentionBoundary> outbox, IUnitOfWork<RetentionBoundary> unitOfWork,
    TimeProvider time, IDocumentVisibility visibility, IArchiveTransferSource source, IPhysicalDispositionGateway physical,
    DispositionReviewPolicy? policy = null) : ICommandHandler<CreateDispositionCommand, Guid>, ICommandHandler<AdvanceDispositionCommand>
{
    public async Task<Result<Guid>> Handle(CreateDispositionCommand command, CancellationToken ct)
    {
        var existing = await processes.GetAsync(command.RequestId, ct);
        if (existing is not null)
        {
            if (!(await visibility.FilterAsync([existing.DocumentId], ct)).Contains(existing.DocumentId))
                return Result<Guid>.Failure(Error.NotFound("retention.process_not_found", "İşlem bulunamadı."));
            if (existing.CreatedBy != user.Subject || existing.RetentionCaseId != command.RetentionCaseId
                || existing.Action != command.Action || existing.Reason != command.Reason?.Trim()
                || existing.CommissionReference != command.CommissionReference?.Trim())
                return Result<Guid>.Failure(Error.Conflict("retention.idempotency_conflict", "İstek kimliği başka bir işlem için kullanılmış."));
            return Result<Guid>.Success(existing.Id);
        }
        var retentionCase = await cases.GetCaseAsync(command.RetentionCaseId, ct);
        if (retentionCase is null || !(await visibility.FilterAsync([retentionCase.DocumentId], ct)).Contains(retentionCase.DocumentId))
            return Result<Guid>.Failure(Error.NotFound("retention.case_not_found", "Saklama dosyası bulunamadı."));
        if (await processes.HasOpenProcessAsync(command.RetentionCaseId, ct))
            return Result<Guid>.Failure(Error.Conflict("retention.process_exists", "Bu dosyanın açık değerlendirme işlemi var."));
        try
        {
            var now = time.GetUtcNow();
            // Operational minimum; it does not assert statutory commission composition.
            var process = DispositionProcess.Create(command.RequestId, retentionCase, command.Action,
                command.Reason, command.CommissionReference, user.Subject, policy?.RequiredIndependentReviews ?? 2, now);
            retentionCase.TouchDisposition();
            await processes.AddAsync(process, ct);
            Publish(process, "Create", "", command.Reason, command.CommissionReference, now);
            await unitOfWork.SaveChangesAsync(ct);
            return Result<Guid>.Success(process.Id);
        }
        catch (DomainRuleViolationException exception)
        {
            return Result<Guid>.Failure(Error.Conflict("retention.process_conflict", exception.Message));
        }
    }

    public async Task<Result> Handle(AdvanceDispositionCommand command, CancellationToken ct)
    {
        if (command.Reason.Length > 2000 || command.Reference.Length > 300 || command.ReceivingArchive.Length > 300)
            return Result.Failure(Error.Validation("retention.invalid_input", "Gerekçe veya referans alanı çok uzun."));
        var process = await processes.GetAsync(command.Id, ct);
        if (process is null || !(await visibility.FilterAsync([process.DocumentId], ct)).Contains(process.DocumentId))
            return Result.Failure(Error.NotFound("retention.process_not_found", "İşlem bulunamadı."));
        if (process.ConcurrencyVersion != command.ExpectedVersion)
            return Result.Failure(Error.Conflict("retention.stale_version", "İşlem değişmiş. Güncel kaydı yükleyip tekrar deneyin."));
        var retentionCase = await cases.GetCaseAsync(process.RetentionCaseId, ct);
        if (retentionCase is null) return Result.Failure(Error.NotFound("retention.case_not_found", "Saklama dosyası bulunamadı."));
        var before = process.Status.ToString();
        var now = time.GetUtcNow();
        try
        {
            switch (command.Operation)
            {
                case DispositionOperation.Submit: process.Submit(user.Subject, retentionCase, now); break;
                case DispositionOperation.Review: process.Review(user.Subject, command.Approved, command.Reason, retentionCase, now); break;
                case DispositionOperation.Approve: process.Approve(user.Subject, command.Reference, retentionCase, now); break;
                case DispositionOperation.AcceptTransfer: process.AcceptTransfer(user.Subject, command.ReceivingArchive, command.Reference, retentionCase, now); break;
                case DispositionOperation.KeepPermanently: process.KeepPermanently(user.Subject, retentionCase, now); break;
                case DispositionOperation.ExecuteDestruction:
                    if (command.EvidenceDocumentId is not Guid evidenceId || command.EvidenceVersionId is not Guid evidenceVersionId
                        || command.ExecutedAt is not DateTimeOffset executedAt)
                        return Result.Failure(Error.Validation("retention.physical_evidence_required", "Fiziksel imhanın tutanak belgesi, sürümü ve gerçekleşme zamanı gereklidir."));
                    var digital = await source.GetAsync(process.DocumentId, ct);
                    if (digital is null || digital.Versions.Count == 0)
                        return Result.Failure(Error.Conflict("retention.digital_original_required", "Fiziksel imha öncesinde belgenin dijital aslı ve sürümleri arşivde bulunmalıdır."));
                    foreach (var original in digital.Versions)
                    {
                        await using var preserved = await source.OpenOriginalAsync(process.DocumentId, original.VersionId, ct);
                        if (preserved is null)
                            return Result.Failure(Error.Conflict("retention.digital_original_missing", "Korunacak dijital sürümlerden biri bulunamadı; fiziksel imha kaydedilmedi."));
                        var verified = await TransferPackageHandler.CopyAndHash(preserved, Stream.Null, original.SizeBytes, ct);
                        if (verified.Size != original.SizeBytes || verified.Sha256 != original.Sha256Hash.ToLowerInvariant())
                            return Result.Failure(Error.Conflict("retention.digital_original_corrupted", "Korunacak dijital sürümün bütünlük doğrulaması başarısız; fiziksel imha kaydedilmedi."));
                    }
                    var evidence = await source.GetAsync(evidenceId, ct);
                    var version = evidence?.Versions.SingleOrDefault(x => x.VersionId == evidenceVersionId);
                    if (version is null) return Result.Failure(Error.NotFound("retention.evidence_not_found", "Erişilebilir tutanak sürümü bulunamadı."));
                    await using (var stream = await source.OpenOriginalAsync(evidenceId, evidenceVersionId, ct))
                    {
                        if (stream is null) return Result.Failure(Error.NotFound("retention.evidence_not_found", "Tutanak aslı bulunamadı."));
                        var actual = await TransferPackageHandler.CopyAndHash(stream, Stream.Null, version.SizeBytes, ct);
                        if (actual.Size != version.SizeBytes || actual.Sha256 != version.Sha256Hash.ToLowerInvariant())
                            return Result.Failure(Error.Conflict("retention.evidence_corrupted", "Tutanak belgesinin bütünlük doğrulaması başarısız."));
                    }
                    process.ExecuteDestruction(user.Subject, command.Reference, evidenceId, evidenceVersionId, version.Sha256Hash,
                        command.Method, command.Location, command.Witnesses, executedAt, retentionCase, now);
                    var physicalResult = await physical.RecordAsync(process.DocumentId, process.Id, user.Subject, command.Reference, evidenceId, executedAt, ct);
                    if (physicalResult.IsFailure) return physicalResult;
                    break;
                default: return Result.Failure(Error.Validation("retention.invalid_operation", "Geçersiz işlem."));
            }
            Publish(process, command.Operation.ToString(), before, command.Reason, command.Reference, now);
            await unitOfWork.SaveChangesAsync(ct);
            return Result.Success();
        }
        catch (Exception exception) when (exception is DomainRuleViolationException or InvalidDataException)
        {
            return Result.Failure(Error.Conflict("retention.process_conflict", exception.Message));
        }
    }

    public async Task<Result> ConfigureCommission(ConfigureCommissionCommand command, CancellationToken ct)
        => await ChangeCommission(command.Id, command.ExpectedVersion, "CommissionConfigured", process =>
            process.ConfigureCommission(user.Subject, command.Members, command.ValidFrom, command.ValidUntil), ct);

    public async Task<Result> DelegateCommission(DelegateCommissionCommand command, CancellationToken ct)
        => await ChangeCommission(command.Id, command.ExpectedVersion, "CommissionDelegated", process =>
            process.DelegateMember(command.Member, command.Delegate, command.Reference, command.ValidFrom, command.ValidUntil), ct);

    private async Task<Result> ChangeCommission(Guid id, long expectedVersion, string operation, Action<DispositionProcess> change, CancellationToken ct)
    {
        var process = await processes.GetAsync(id, ct);
        if (process is null || !(await visibility.FilterAsync([process.DocumentId], ct)).Contains(process.DocumentId))
            return Result.Failure(Error.NotFound("retention.process_not_found", "İşlem bulunamadı."));
        if (process.ConcurrencyVersion != expectedVersion)
            return Result.Failure(Error.Conflict("retention.stale_version", "İşlem değişmiş. Güncel kaydı yükleyin."));
        try
        {
            change(process); Publish(process, operation, process.Status.ToString(), System.Text.Json.JsonSerializer.Serialize(new { process.CommissionValidFrom, process.CommissionValidUntil, process.Members }), process.CommissionReference, time.GetUtcNow());
            await unitOfWork.SaveChangesAsync(ct); return Result.Success();
        }
        catch (DomainRuleViolationException exception) { return Result.Failure(Error.Conflict("retention.commission_invalid", exception.Message)); }
    }

    private void Publish(DispositionProcess process, string operation, string before, string reason, string reference, DateTimeOffset now)
        => outbox.Enqueue(new DispositionChangedIntegrationEvent(Guid.CreateVersion7(), process.Id,
            process.RetentionCaseId, process.DocumentId, process.Action.ToString(), operation, before,
            process.Status.ToString(), user.Subject, reason, reference, process.ConcurrencyVersion, now));
}
