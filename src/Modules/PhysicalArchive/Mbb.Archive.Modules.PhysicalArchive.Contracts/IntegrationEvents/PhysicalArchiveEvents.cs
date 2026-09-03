using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.PhysicalArchive.Contracts.IntegrationEvents;

public sealed record PhysicalFolderRegisteredIntegrationEvent(
    Guid EventId,
    Guid FolderId,
    string Barcode,
    Guid LocationId,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "physical-archive.folder-registered.v1";
}

public sealed record PhysicalLoanChangedIntegrationEvent(
    Guid EventId,
    Guid LoanId,
    Guid FolderId,
    string Status,
    string BorrowerSubjectId,
    DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "physical-archive.loan-changed.v1";
}
