using System.Security.Cryptography;
using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.OfficialCorrespondence.Application.Abstractions;
using Mbb.Archive.Modules.OfficialCorrespondence.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.OfficialCorrespondence.Domain.Eyp;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Application.Eyp;

public sealed class InspectEypPackageCommandHandler :
    ICommandHandler<InspectEypPackageCommand, EypInspectionResponse>
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly IEypStructuralInspector _structuralInspector;
    private readonly IEyp21OfficialValidator _officialValidator;
    private readonly IEypInspectionRepository _repository;
    private readonly IUnitOfWork<OfficialCorrespondenceBoundary> _unitOfWork;
    private readonly IOutbox<OfficialCorrespondenceBoundary> _outbox;
    private readonly TimeProvider _time;

    public InspectEypPackageCommandHandler(
        IEypStructuralInspector structuralInspector,
        IEyp21OfficialValidator officialValidator,
        IEypInspectionRepository repository,
        IUnitOfWork<OfficialCorrespondenceBoundary> unitOfWork,
        IOutbox<OfficialCorrespondenceBoundary> outbox,
        TimeProvider time)
    {
        _structuralInspector = structuralInspector;
        _officialValidator = officialValidator;
        _repository = repository;
        _unitOfWork = unitOfWork;
        _outbox = outbox;
        _time = time;
    }

    public async Task<Result<EypInspectionResponse>> Handle(
        InspectEypPackageCommand command,
        CancellationToken ct)
    {
        var sha256 = await ComputeSha256Async(command.Content, ct);

        EypStructuralInspectionResult structural;
        await using (var stream = await command.Content.OpenReadAsync(ct))
        {
            structural = await _structuralInspector.InspectAsync(stream, ct);
        }

        EypOfficialValidationResult official;
        await using (var stream = await command.Content.OpenReadAsync(ct))
        {
            official = await _officialValidator.ValidateAsync(stream, ct);
        }

        var now = _time.GetUtcNow();
        var inspection = EypPackageInspection.Create(
            command.DocumentId,
            command.DocumentVersionId,
            command.Content.FileName,
            sha256,
            now);

        inspection.ApplyResults(
            structural.PartCount,
            structural.RelationshipCount,
            structural.Status,
            official.Status,
            JsonSerializer.Serialize(structural, JsonOptions),
            JsonSerializer.Serialize(official, JsonOptions));

        await _repository.AddAsync(inspection, ct);

        _outbox.Enqueue(
            new EypPackageInspectedIntegrationEvent(
                Guid.CreateVersion7(),
                inspection.Id,
                inspection.DocumentId,
                inspection.DocumentVersionId,
                inspection.PackageSha256,
                inspection.StructuralStatus.ToString(),
                inspection.OfficialValidationStatus.ToString(),
                now));

        await _unitOfWork.SaveChangesAsync(ct);

        return Result<EypInspectionResponse>.Success(ToResponse(inspection));
    }

    private static async Task<string> ComputeSha256Async(
        IEypPackageContent content,
        CancellationToken ct)
    {
        await using var stream = await content.OpenReadAsync(ct);

        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        var buffer = new byte[1024 * 1024];

        while (true)
        {
            var read = await stream.ReadAsync(buffer, ct);

            if (read == 0)
                break;

            hash.AppendData(buffer, 0, read);
        }

        return Convert
            .ToHexString(hash.GetHashAndReset())
            .ToLowerInvariant();
    }

    internal static EypInspectionResponse ToResponse(
        EypPackageInspection inspection)
        => new(
            inspection.Id,
            inspection.FileName,
            inspection.PackageSha256,
            inspection.PartCount,
            inspection.RelationshipCount,
            inspection.StructuralStatus.ToString(),
            inspection.OfficialValidationStatus.ToString(),
            inspection.StructuralReportJson,
            inspection.OfficialReportJson);
}
