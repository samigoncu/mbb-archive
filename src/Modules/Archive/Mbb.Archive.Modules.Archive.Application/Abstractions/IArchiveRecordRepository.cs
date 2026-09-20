using Mbb.Archive.Modules.Archive.Domain.Records;
namespace Mbb.Archive.Modules.Archive.Application.Abstractions;

public interface IArchiveRecordRepository { Task AddAsync(ArchiveRecord record, CancellationToken ct); Task<ArchiveRecord?> GetAsync(ArchiveRecordId id, CancellationToken ct); Task<ArchiveRecord?> GetByDocumentVersionAsync(Guid versionId, CancellationToken ct); Task<ArchiveRecord?> GetByDocumentIdAsync(Guid documentId, CancellationToken ct); }
