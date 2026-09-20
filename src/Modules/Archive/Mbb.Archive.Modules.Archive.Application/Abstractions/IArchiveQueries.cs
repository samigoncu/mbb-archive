using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Archive.Application.Records.Get;
using Mbb.Archive.Modules.Archive.Application.Records.List;

namespace Mbb.Archive.Modules.Archive.Application.Abstractions;

/// <summary>
/// Okuma sorguları kapsamı parametre olarak alır: süzgeci çağıranın
/// hatırlamasına bırakmak, unutulduğu yerde sızıntı demektir.
/// </summary>
public interface IArchiveQueries
{
    Task<ArchiveRecordDetails?> GetAsync(Guid id, AccessScope scope, CancellationToken ct);

    Task<PagedResult<ArchiveRecordListItem>> GetPageAsync(
        PageRequest page,
        string? status,
        Guid? documentId,
        AccessScope scope,
        CancellationToken ct);
}
