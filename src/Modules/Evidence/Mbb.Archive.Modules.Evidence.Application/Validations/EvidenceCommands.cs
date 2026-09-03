using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Evidence.Application.Validations;

public sealed record ValidateCmsSignatureCommand(
    Guid? DocumentId,
    Guid? DocumentVersionId,
    byte[] Signature,
    byte[]? DetachedContent) : ICommand<EvidenceValidationResponse>;

public sealed record ValidateTimestampCommand(
    Guid? DocumentId,
    Guid? DocumentVersionId,
    byte[] Token,
    byte[] Data) : ICommand<EvidenceValidationResponse>;

public sealed record ValidatePdfSignatureCommand(
    Guid? DocumentId,
    Guid? DocumentVersionId,
    byte[] Pdf) : ICommand<EvidenceValidationResponse>;

public sealed record RequestTimestampCommand(
    byte[] Data) : ICommand<IssuedTimestampResponse>;

public sealed record EvidenceValidationResponse(
    Guid Id,
    string Kind,
    string Status,
    string Provider,
    string ContentSha256,
    string ReportJson);

public sealed record IssuedTimestampResponse(
    string TokenBase64,
    DateTimeOffset Timestamp,
    string PolicyOid,
    string HashAlgorithmOid,
    string TsaSubject);
