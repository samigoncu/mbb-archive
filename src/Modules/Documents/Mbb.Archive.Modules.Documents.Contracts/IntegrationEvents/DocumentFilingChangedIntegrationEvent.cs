using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Documents.Contracts.IntegrationEvents;
public sealed record DocumentFilingChangedIntegrationEvent(Guid EventId, Guid DocumentId, string DocumentTitle,
    Guid? PreviousDossierId, Guid? DossierId, string? PreviousFilePlanCode, string FilePlanCode,
    Guid[] PreviousFolderIds, Guid[] FolderIds, string Reason, string Actor, DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public string EventName => "documents.filing-changed.v1";
}
