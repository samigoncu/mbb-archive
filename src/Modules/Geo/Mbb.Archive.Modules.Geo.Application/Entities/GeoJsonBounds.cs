using System.Text.Json;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Geo.Application.Abstractions;
using Mbb.Archive.Modules.Geo.Domain.Entities;
using Mbb.Archive.Modules.Geo.Contracts.IntegrationEvents;
using Mbb.Archive.Modules.Geo.Domain.Relations;

namespace Mbb.Archive.Modules.Geo.Application.Entities;

public static class GeoJsonBounds
{
    public static bool TryCompute(
        string geoJson,
        out GeoBoundingBox boundingBox,
        out string? error)
    {
        boundingBox = GeoBoundingBox.Empty;
        error = null;

        JsonDocument document;

        try
        {
            document = JsonDocument.Parse(geoJson);
        }
        catch (JsonException exception)
        {
            error = $"Geometry is not valid JSON: {exception.Message}";
            return false;
        }

        using (document)
        {
            if (!document.RootElement.TryGetProperty("coordinates", out var coordinates))
            {
                error = "Geometry must be a GeoJSON object with a 'coordinates' member.";
                return false;
            }

            var points = new List<(double, double)>();
            Collect(coordinates, points);

            if (points.Count == 0)
            {
                error = "Geometry contains no coordinates.";
                return false;
            }

            boundingBox = GeoBoundingBox.FromCoordinates(points);
            return true;
        }
    }

    private static void Collect(JsonElement element, List<(double, double)> points)
    {
        if (element.ValueKind != JsonValueKind.Array)
            return;

        // [lon, lat] yaprak konumu; aksi hâlde iç içe koordinat dizisi.
        if (element.GetArrayLength() >= 2
            && element[0].ValueKind == JsonValueKind.Number
            && element[1].ValueKind == JsonValueKind.Number)
        {
            points.Add((element[0].GetDouble(), element[1].GetDouble()));
            return;
        }

        foreach (var child in element.EnumerateArray())
            Collect(child, points);
    }
}
