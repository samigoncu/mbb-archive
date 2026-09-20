using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Documents.Application.Documents.List;

namespace Mbb.Archive.Modules.Documents.Presentation.Endpoints;

internal static class GetDocumentsEndpoint
{
    internal static RouteGroupBuilder MapGetDocuments(this RouteGroupBuilder group)
    {
        group.MapGet(
                "/",
                async (
                    int? page,
                    int? pageSize,
                    string? search,
                    string? status,
                    DateTimeOffset? createdFrom,
                    DateTimeOffset? createdTo,
                    string? sort, Guid? ownerUnitId, string? filePlanCode, Guid? dossierId, bool? unfiled,
                    GetDocumentsQueryHandler handler,
                    CancellationToken cancellationToken) =>
                {
                    var result = await handler.Handle(
                        new GetDocumentsQuery(
                            page ?? 1,
                            pageSize ?? 25,
                            new DocumentListFilter(
                                search,
                                status,
                                createdFrom,
                                createdTo, ownerUnitId, filePlanCode, dossierId, unfiled ?? false),
                            ParseSort(sort)),
                        cancellationToken);

                    return result.IsFailure
                        ? ApiResults.Problem(result.Error)
                        : Results.Ok(result.Value);
                })
            .RequireAuthorization("permission:documents.read")
            .WithName("GetDocuments")
            .WithSummary("Gets a filtered, sorted and paginated document read model.");

        return group;
    }

    /// <summary>
    /// Bilinmeyen sıralama anahtarı hata değil, varsayılana düşüştür; liste
    /// ekranı eski bağlantılarla da çalışmaya devam eder.
    /// </summary>
    private static DocumentListSort ParseSort(string? sort)
        => sort?.Trim().ToLowerInvariant() switch
        {
            "createdat_asc" => DocumentListSort.CreatedAtAscending,
            "title_asc" => DocumentListSort.TitleAscending,
            "title_desc" => DocumentListSort.TitleDescending,
            _ => DocumentListSort.CreatedAtDescending
        };
}
