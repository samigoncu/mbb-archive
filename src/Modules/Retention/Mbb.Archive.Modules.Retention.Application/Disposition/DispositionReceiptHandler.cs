using System.Security.Cryptography;
using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Retention.Domain.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.Application.Disposition;

public sealed class DispositionReceiptHandler(IDispositionRepository repository, IDocumentVisibility visibility)
{
    public async Task<Result<byte[]>> Handle(Guid id, CancellationToken ct)
    {
        var process = await repository.GetAsync(id, ct);
        if (process is null || !(await visibility.FilterAsync([process.DocumentId], ct)).Contains(process.DocumentId)) return Result<byte[]>.Failure(Error.NotFound("retention.process_not_found", "İşlem bulunamadı."));
        if (process.Status != DispositionProcessStatus.Completed)
            return Result<byte[]>.Failure(Error.Conflict("retention.receipt_not_ready", "Tutanak yalnız tamamlanmış işlem için üretilebilir."));
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var payload = JsonSerializer.SerializeToUtf8Bytes(DispositionDetails.From(process), options);
        // Hash checks the integrity of this exact payload, not a legal signature or proof of binary destruction.
        var isDestruction = process.Action == DispositionAction.Destroy;
        return Result<byte[]>.Success(JsonSerializer.SerializeToUtf8Bytes(new
        {
            format = isDestruction ? "mbb.physical-destruction-record.v2" : "mbb.disposition-receipt.v2",
            payloadEncoding = "base64",
            payload = Convert.ToBase64String(payload),
            sha256 = Convert.ToHexStringLower(SHA256.HashData(payload)),
            qualifiedElectronicSignature = false,
            evidenceType = isDestruction ? "PhysicalExecutionEvidence" : "AdministrativeReceipt",
            protocolReference = process.ReceiptReference ?? "",
            completedBy = process.CompletedBy,
            completedAt = process.CompletedAt,
            physicalDestructionRecorded = isDestruction && process.ExecutionEvidenceVersionId is not null,
            destructionExecuted = false,
            originalFilesDeleted = false,
            digitalOriginalsPreserved = true,
            executionEvidenceVerified = process.ExecutionEvidenceVersionId is not null,
            transferPackageId = process.TransferPackageId,
            transferPackageSha256 = process.TransferPackageSha256,
            transferManifestSha256 = process.TransferManifestSha256
        }, options));
    }
}
