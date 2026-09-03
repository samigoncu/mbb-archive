using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.OfficialCorrespondence.Application.Abstractions;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Application.Eyp;

public sealed record InspectEypPackageCommand(
    Guid? DocumentId,
    Guid? DocumentVersionId,
    IEypPackageContent Content)
    : ICommand<EypInspectionResponse>;

public sealed record EypInspectionResponse(
    Guid Id,
    string FileName,
    string PackageSha256,
    int PartCount,
    int RelationshipCount,
    string StructuralStatus,
    string OfficialValidationStatus,
    string StructuralReportJson,
    string OfficialReportJson);
