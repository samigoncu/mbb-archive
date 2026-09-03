using Mbb.Archive.Modules.Documents.Application;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Domain.Ingestions;

namespace Mbb.Archive.Modules.Documents.Application.Documents.ProcessSecurityResult;

public sealed class RejectDocumentFileSecurityCommandHandler
    : ICommandHandler<RejectDocumentFileSecurityCommand>
{
    private readonly IDocumentIngestionRepository _ingestions;
    private readonly IInbox<DocumentsBoundary> _inbox;
    private readonly IUnitOfWork<DocumentsBoundary> _unitOfWork;

    public RejectDocumentFileSecurityCommandHandler(
        IDocumentIngestionRepository ingestions,
        IInbox<DocumentsBoundary> inbox,
        IUnitOfWork<DocumentsBoundary> unitOfWork)
    {
        _ingestions = ingestions;
        _inbox = inbox;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(
        RejectDocumentFileSecurityCommand command,
        CancellationToken cancellationToken)
    {
        if (await _inbox.HasProcessedAsync(command.MessageId, cancellationToken))
            return Result.Success();

        var ingestion = await _ingestions.GetByIdAsync(
            new DocumentFileIngestionId(command.IngestionId),
            cancellationToken);

        if (ingestion is null)
            return Result.Failure(SecurityResultErrors.IngestionNotFound);

        if (ingestion.DocumentId.Value != command.DocumentId)
            return Result.Failure(SecurityResultErrors.DocumentMismatch);

        try
        {
            var detail = command.ThreatName is null
                ? command.Detail
                : $"{command.Detail} Threat: {command.ThreatName}";

            ingestion.RejectSecurityScan(
                command.ReasonCode,
                detail,
                command.DetectedMimeType,
                command.ScannedAt);

            _inbox.MarkProcessed(
                command.MessageId,
                command.EventName,
                command.ScannedAt);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
        catch (DomainRuleViolationException ex)
        {
            return Result.Failure(
                Error.Conflict(
                    "documents.security_result_conflict",
                    ex.Message));
        }
    }
}
