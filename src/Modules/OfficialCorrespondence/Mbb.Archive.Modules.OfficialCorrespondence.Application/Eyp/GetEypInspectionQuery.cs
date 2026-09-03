using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.OfficialCorrespondence.Application.Eyp;

public sealed record GetEypInspectionQuery(Guid Id)
    : IQuery<EypInspectionResponse>;
