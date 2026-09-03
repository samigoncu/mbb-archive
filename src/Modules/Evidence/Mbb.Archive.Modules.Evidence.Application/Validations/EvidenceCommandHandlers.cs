using System.Security.Cryptography;
using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Evidence.Application.Abstractions;
using Mbb.Archive.Modules.Evidence.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Evidence.Domain.Validations;

namespace Mbb.Archive.Modules.Evidence.Application.Validations;

public sealed class EvidenceCommandHandlers :
    ICommandHandler<ValidateCmsSignatureCommand, EvidenceValidationResponse>,
    ICommandHandler<ValidateTimestampCommand, EvidenceValidationResponse>,
    ICommandHandler<ValidatePdfSignatureCommand, EvidenceValidationResponse>,
    ICommandHandler<RequestTimestampCommand, IssuedTimestampResponse>
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly IEvidenceRepository _repository;
    private readonly ICmsSignatureValidator _cms;
    private readonly IRfc3161TimestampValidator _timestamp;
    private readonly IRfc3161TimestampClient _timestampClient;
    private readonly IPdfSignatureValidator _pdf;
    private readonly IUnitOfWork<EvidenceBoundary> _unitOfWork;
    private readonly IOutbox<EvidenceBoundary> _outbox;
    private readonly TimeProvider _time;

    public EvidenceCommandHandlers(
        IEvidenceRepository repository,
        ICmsSignatureValidator cms,
        IRfc3161TimestampValidator timestamp,
        IRfc3161TimestampClient timestampClient,
        IPdfSignatureValidator pdf,
        IUnitOfWork<EvidenceBoundary> unitOfWork,
        IOutbox<EvidenceBoundary> outbox,
        TimeProvider time)
    {
        _repository = repository;
        _cms = cms;
        _timestamp = timestamp;
        _timestampClient = timestampClient;
        _pdf = pdf;
        _unitOfWork = unitOfWork;
        _outbox = outbox;
        _time = time;
    }

    public async Task<Result<EvidenceValidationResponse>> Handle(
        ValidateCmsSignatureCommand command,
        CancellationToken ct)
    {
        var target = command.DetachedContent ?? command.Signature;
        var result = await _cms.ValidateAsync(
            command.Signature,
            command.DetachedContent,
            ct);

        return await PersistAsync(
            command.DocumentId,
            command.DocumentVersionId,
            EvidenceKind.CmsSignature,
            Sha256(target),
            "CMS/PKCS#7 cryptographic + X.509 chain",
            result.Status,
            result.Provider,
            result,
            ct);
    }

    public async Task<Result<EvidenceValidationResponse>> Handle(
        ValidateTimestampCommand command,
        CancellationToken ct)
    {
        var result = await _timestamp.ValidateAsync(
            command.Token,
            command.Data,
            ct);

        return await PersistAsync(
            command.DocumentId,
            command.DocumentVersionId,
            EvidenceKind.Rfc3161Timestamp,
            Sha256(command.Data),
            "RFC 3161",
            result.Status,
            result.Provider,
            result,
            ct);
    }

    public async Task<Result<EvidenceValidationResponse>> Handle(
        ValidatePdfSignatureCommand command,
        CancellationToken ct)
    {
        var result = await _pdf.ValidateAsync(command.Pdf, ct);

        return await PersistAsync(
            command.DocumentId,
            command.DocumentVersionId,
            EvidenceKind.PdfPades,
            Sha256(command.Pdf),
            "PAdES provider boundary",
            result.Status,
            result.Provider,
            result,
            ct);
    }

    public async Task<Result<IssuedTimestampResponse>> Handle(
        RequestTimestampCommand command,
        CancellationToken ct)
    {
        if (command.Data.Length == 0)
        {
            return Result<IssuedTimestampResponse>.Failure(
                Error.Validation(
                    "evidence.timestamp_data_required",
                    "Timestamp data is required."));
        }

        try
        {
            var issued = await _timestampClient.RequestAsync(command.Data, ct);

            return Result<IssuedTimestampResponse>.Success(
                new IssuedTimestampResponse(
                    Convert.ToBase64String(issued.Token),
                    issued.Timestamp,
                    issued.PolicyOid,
                    issued.HashAlgorithmOid,
                    issued.TsaSubject));
        }
        catch (Exception ex) when (ex is HttpRequestException or CryptographicException or InvalidOperationException)
        {
            return Result<IssuedTimestampResponse>.Failure(
                Error.Failure(
                    "evidence.timestamp_request_failed",
                    ex.Message));
        }
    }

    private async Task<Result<EvidenceValidationResponse>> PersistAsync<TReport>(
        Guid? documentId,
        Guid? documentVersionId,
        EvidenceKind kind,
        string sha256,
        string profile,
        EvidenceValidationStatus status,
        string provider,
        TReport report,
        CancellationToken ct)
    {
        try
        {
            var now = _time.GetUtcNow();
            var validation = EvidenceValidation.Start(
                documentId,
                documentVersionId,
                kind,
                sha256,
                profile,
                now);

            validation.Complete(
                status,
                provider,
                JsonSerializer.Serialize(report, JsonOptions),
                now);

            await _repository.AddAsync(validation, ct);

            _outbox.Enqueue(
                new EvidenceValidationCompletedIntegrationEvent(
                    Guid.CreateVersion7(),
                    validation.Id,
                    validation.DocumentId,
                    validation.DocumentVersionId,
                    validation.Kind.ToString(),
                    validation.Status.ToString(),
                    validation.Provider,
                    now));

            await _unitOfWork.SaveChangesAsync(ct);

            return Result<EvidenceValidationResponse>.Success(
                new EvidenceValidationResponse(
                    validation.Id,
                    validation.Kind.ToString(),
                    validation.Status.ToString(),
                    validation.Provider,
                    validation.ContentSha256,
                    validation.ReportJson));
        }
        catch (DomainRuleViolationException ex)
        {
            return Result<EvidenceValidationResponse>.Failure(
                Error.Conflict(
                    "evidence.validation_conflict",
                    ex.Message));
        }
    }

    private static string Sha256(ReadOnlySpan<byte> data)
        => Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();
}
