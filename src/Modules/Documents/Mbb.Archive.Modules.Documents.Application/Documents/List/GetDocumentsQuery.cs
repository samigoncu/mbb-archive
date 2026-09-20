using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.List;

/// <summary>
/// Belge listesi sorgusu. Süzgeç ve sıralama isteğe bağlıdır; verilmediğinde
/// davranış eskisiyle aynıdır (oluşturma tarihine göre azalan, süzgeçsiz).
/// </summary>
public sealed record GetDocumentsQuery(
    int Page = 1,
    int PageSize = PageRequest.DefaultPageSize,
    DocumentListFilter? Filter = null,
    DocumentListSort Sort = DocumentListSort.CreatedAtDescending)
    : IQuery<PagedResult<DocumentListItem>>;

/// <param name="Search">Başlıkta büyük/küçük harf duyarsız parça arama.</param>
/// <param name="Status">Tam eşleşen belge durumu; geçersiz değer sonuç döndürmez.</param>
public sealed record DocumentListFilter(
    string? Search = null,
    string? Status = null,
    DateTimeOffset? CreatedFrom = null,
    DateTimeOffset? CreatedTo = null, Guid? OwnerUnitId = null, string? FilePlanCode = null,
    Guid? DossierId = null, bool Unfiled = false);

public enum DocumentListSort
{
    CreatedAtDescending = 0,
    CreatedAtAscending = 1,
    TitleAscending = 2,
    TitleDescending = 3
}

public sealed record DocumentListItem(
    Guid Id,
    string Title,
    string Status,
    DateTimeOffset CreatedAt,
    int VersionCount, Guid? OwnerUnitId = null, Guid? DossierId = null);
