using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
namespace Mbb.Archive.Modules.Geo.Application.Entities;
public sealed class ImportProviderFeatureHandler(IGeoFeatureProvider provider, GeoCommandHandlers commands)
{
    public async Task<Result<Guid>> Handle(string layer, string featureId, CancellationToken ct)
    {
        var result = await provider.GetFeatureAsync(layer, featureId, ct);
        if (result.IsFailure) return Result<Guid>.Failure(result.Error);
        var feature = result.Value;
        return await commands.Handle(new ImportGeoEntityCommand(feature.Provider, feature.LayerName,
            feature.FeatureId, feature.SuggestedEntityType.ToString(), feature.Name, feature.GeoJson,
            feature.PropertiesJson, null), ct);
    }
}
