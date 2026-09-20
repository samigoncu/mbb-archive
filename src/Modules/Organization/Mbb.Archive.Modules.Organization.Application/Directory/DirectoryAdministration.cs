using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Organization.Application.Directory;
public sealed record DirectorySyncReport(int UnitsCreated, int UnitsLinked, int MembershipsAssigned,
    IReadOnlyList<string> Warnings, int MembershipsRemoved = 0);
public sealed record DirectoryStatus(bool UserSyncConfigured, bool UnitSyncConfigured, string Authentication);
public sealed record DirectoryRun(Guid Id, string Kind, string SubjectId, string RequestedBy, string Status,
    string Summary, DateTimeOffset StartedAt, DateTimeOffset CompletedAt);
public interface IDirectoryAdministration
{
    DirectoryStatus Status { get; }
    Task<IReadOnlyList<DirectoryRun>> HistoryAsync(CancellationToken ct);
    Task<Result<DirectorySyncReport>> SyncUnitsAsync(string actor, CancellationToken ct);
    Task<Result<DirectorySyncReport>> SyncUserAsync(string subjectId, string directoryUserName, string actor, CancellationToken ct);
}
