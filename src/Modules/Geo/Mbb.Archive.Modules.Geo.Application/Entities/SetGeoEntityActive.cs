using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Domain.Entities;
namespace Mbb.Archive.Modules.Geo.Application.Entities;
public sealed class SetGeoEntityActiveHandler(IGeoRepository repository, IGeoQueries queries, IUnitOfWork<GeoBoundary> unitOfWork)
{
    public async Task<Result> Handle(Guid id, bool active, CancellationToken ct)
    {
        var entity = await repository.GetEntityAsync(new GeoEntityId(id), ct);
        if (entity is null) return Result.Failure(GeoErrors.EntityNotFound);
        if (!active && (await queries.GetRelatedDocumentsAsync(id, true, ct)).Count > 0)
            return Result.Failure(GeoErrors.Conflict("Önce aktif belge ilişkilerini sonlandırın; ilişki geçmişi korunur."));
        entity.SetActive(active);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}
