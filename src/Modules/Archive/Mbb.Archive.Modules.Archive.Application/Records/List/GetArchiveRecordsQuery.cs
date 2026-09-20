using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Archive.Application.Records.List;

/// <param name="Status">Tam eşleşen kayıt durumu; geçersiz değer sonuç döndürmez.</param>
public sealed record GetArchiveRecordsQuery(
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize,
    string? Status = null,
    Guid? DocumentId = null)
    : IQuery<PagedResult<ArchiveRecordListItem>>;

/// <summary>
/// Kayıt beyanı listesi. Depolama anahtarı dışarı verilmez; ekranda gereken
/// künye bilgisi bütünlük özeti ve yaşam döngüsü durumudur.
/// </summary>
public sealed record ArchiveRecordListItem(
    Guid Id,
    Guid DocumentId,
    Guid DocumentVersionId,
    string Status,
    string Sha256Hash,
    string MimeType,
    long SizeBytes,
    string? ClassificationCode,
    string? RetentionRuleCode,
    DateTimeOffset CreatedAt,
    DateTimeOffset? DeclaredAt);
