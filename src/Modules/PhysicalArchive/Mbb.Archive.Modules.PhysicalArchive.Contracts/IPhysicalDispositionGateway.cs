using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.PhysicalArchive.Contracts;

/// <summary>Records an evidenced physical event without removing document links or digital objects.</summary>
public interface IPhysicalDispositionGateway
{
    Task<Result> RecordAsync(Guid documentId, Guid processId, string actor, string protocolReference,
        Guid evidenceDocumentId, DateTimeOffset executedAt, CancellationToken ct);
}
