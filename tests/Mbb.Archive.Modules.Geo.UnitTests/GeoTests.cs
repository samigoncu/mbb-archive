using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Geo.Application.Entities;
using Mbb.Archive.Modules.Geo.Domain.Entities;
using Mbb.Archive.Modules.Geo.Domain.Relations;

namespace Mbb.Archive.Modules.Geo.UnitTests;

[TestClass]
public sealed class GeoJsonBoundsTests
{
    [TestMethod]
    public void Computes_bounds_for_a_line_string()
    {
        const string geoJson = """
            {"type":"LineString","coordinates":[[38.29875,38.34612],[38.31644,38.35121]]}
            """;

        Assert.IsTrue(GeoJsonBounds.TryCompute(geoJson, out var box, out _));

        Assert.AreEqual(38.29875, box.MinLongitude, 1e-9);
        Assert.AreEqual(38.34612, box.MinLatitude, 1e-9);
        Assert.AreEqual(38.31644, box.MaxLongitude, 1e-9);
        Assert.AreEqual(38.35121, box.MaxLatitude, 1e-9);
    }

    [TestMethod]
    public void Computes_bounds_for_a_nested_polygon()
    {
        const string geoJson = """
            {"type":"Polygon","coordinates":[[[38.20,38.27],[38.35,38.27],[38.35,38.36],[38.20,38.36],[38.20,38.27]]]}
            """;

        Assert.IsTrue(GeoJsonBounds.TryCompute(geoJson, out var box, out _));

        Assert.AreEqual(38.20, box.MinLongitude, 1e-9);
        Assert.AreEqual(38.36, box.MaxLatitude, 1e-9);
    }

    [TestMethod]
    public void Computes_bounds_for_a_point()
    {
        Assert.IsTrue(
            GeoJsonBounds.TryCompute(
                """{"type":"Point","coordinates":[38.31644,38.35121]}""",
                out var box,
                out _));

        Assert.AreEqual(box.MinLongitude, box.MaxLongitude, 1e-9);
        Assert.AreEqual(box.MinLatitude, box.MaxLatitude, 1e-9);
    }

    [TestMethod]
    public void Rejects_malformed_json()
    {
        Assert.IsFalse(GeoJsonBounds.TryCompute("{bozuk", out _, out var error));
        Assert.IsTrue(error!.Contains("valid JSON", StringComparison.Ordinal));
    }

    [TestMethod]
    public void Rejects_geometry_without_coordinates()
    {
        Assert.IsFalse(
            GeoJsonBounds.TryCompute("""{"type":"Point"}""", out _, out var error));

        Assert.IsTrue(error!.Contains("coordinates", StringComparison.Ordinal));
    }

    [TestMethod]
    public void Rejects_empty_coordinate_array()
        => Assert.IsFalse(
            GeoJsonBounds.TryCompute(
                """{"type":"LineString","coordinates":[]}""",
                out _,
                out _));
}

[TestClass]
public sealed class BboxParsingTests
{
    [TestMethod]
    public void Parses_a_well_formed_bbox()
    {
        Assert.IsTrue(GeoBbox.TryParse("38.29,38.34,38.32,38.36", out var box));
        Assert.AreEqual(38.29, box.MinLongitude, 1e-9);
        Assert.AreEqual(38.36, box.MaxLatitude, 1e-9);
    }

    /// <summary>Ters çevrilmiş kutu sessizce düzeltilmez; istek reddedilir.</summary>
    [TestMethod]
    public void Rejects_an_inverted_bbox()
        => Assert.IsFalse(GeoBbox.TryParse("38.32,38.36,38.29,38.34", out _));

    [TestMethod]
    public void Rejects_a_bbox_with_wrong_arity()
        => Assert.IsFalse(GeoBbox.TryParse("38.29,38.34,38.32", out _));

    [TestMethod]
    public void Rejects_non_numeric_input()
        => Assert.IsFalse(GeoBbox.TryParse("abc", out _));
}

[TestClass]
public sealed class GeoBoundingBoxTests
{
    [TestMethod]
    public void Detects_intersection()
    {
        var a = new GeoBoundingBox(0, 0, 10, 10);
        var b = new GeoBoundingBox(5, 5, 15, 15);

        Assert.IsTrue(a.Intersects(b));
        Assert.IsTrue(b.Intersects(a));
    }

    [TestMethod]
    public void Detects_disjoint_boxes()
    {
        var a = new GeoBoundingBox(0, 0, 1, 1);
        var b = new GeoBoundingBox(2, 2, 3, 3);

        Assert.IsFalse(a.Intersects(b));
    }
}

[TestClass]
public sealed class DocumentGeoRelationTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 9, 5, 10, 0, 0, TimeSpan.Zero);

    [TestMethod]
    public void New_relation_is_active()
    {
        var relation = Create();

        Assert.IsTrue(relation.IsActiveAt(Now));
        Assert.IsNull(relation.ValidTo);
    }

    /// <summary>
    /// Kapatma kaydı silmez; hangi kararın hangi dönemde etkili olduğu
    /// geçmişte kalır.
    /// </summary>
    [TestMethod]
    public void Closing_ends_validity_without_deleting()
    {
        var relation = Create();

        relation.Close(Now.AddDays(30));

        Assert.AreEqual(Now.AddDays(30), relation.ValidTo);
        Assert.IsFalse(relation.IsActiveAt(Now.AddDays(31)));
        Assert.IsTrue(relation.IsActiveAt(Now.AddDays(1)));
    }

    [TestMethod]
    public void Closing_twice_keeps_the_first_end_date()
    {
        var relation = Create();

        relation.Close(Now.AddDays(10));
        relation.Close(Now.AddDays(20));

        Assert.AreEqual(Now.AddDays(10), relation.ValidTo);
    }

    [TestMethod]
    public void Rejects_validity_that_ends_before_it_starts()
        => Assert.ThrowsExactly<DomainRuleViolationException>(
            () => DocumentGeoRelation.Create(
                Guid.CreateVersion7(),
                GeoEntityId.New(),
                GeoRelationType.Subject,
                Now.AddDays(5),
                Now,
                "dev-admin",
                Now));

    [TestMethod]
    public void Requires_a_document()
        => Assert.ThrowsExactly<DomainRuleViolationException>(
            () => DocumentGeoRelation.Create(
                Guid.Empty,
                GeoEntityId.New(),
                GeoRelationType.Subject,
                null,
                null,
                "dev-admin",
                Now));

    private static DocumentGeoRelation Create()
        => DocumentGeoRelation.Create(
            Guid.CreateVersion7(),
            GeoEntityId.New(),
            GeoRelationType.Subject,
            null,
            null,
            "dev-admin",
            Now);
}

[TestClass]
public sealed class GeoEntityTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 9, 5, 10, 0, 0, TimeSpan.Zero);

    /// <summary>
    /// §9: yalnız koordinat değil, sağlayıcı katmanındaki kalıcı feature
    /// kimliği saklanır.
    /// </summary>
    [TestMethod]
    public void Keeps_the_provider_feature_identity()
    {
        var entity = Import();

        Assert.AreEqual("local", entity.Provider);
        Assert.AreEqual("hal-yolu", entity.FeatureId);
        Assert.AreEqual(GeoEntityType.Road, entity.EntityType);
    }

    [TestMethod]
    public void Refresh_updates_geometry_without_changing_identity()
    {
        var entity = Import();
        var before = entity.ConcurrencyVersion;

        entity.Refresh(
            "Hal Yolu (düzenlenmiş)",
            """{"type":"Point","coordinates":[38.3,38.35]}""",
            null,
            new GeoBoundingBox(38.3, 38.35, 38.3, 38.35));

        Assert.AreEqual("hal-yolu", entity.FeatureId);
        Assert.AreEqual("Hal Yolu (düzenlenmiş)", entity.Name);
        Assert.IsTrue(entity.ConcurrencyVersion > before);
    }

    [TestMethod]
    public void Requires_a_name()
        => Assert.ThrowsExactly<DomainRuleViolationException>(
            () => GeoEntity.Import(
                "local",
                "local",
                "x",
                GeoEntityType.Road,
                "  ",
                """{"type":"Point","coordinates":[0,0]}""",
                null,
                null,
                GeoBoundingBox.Empty,
                Now));

    private static GeoEntity Import()
        => GeoEntity.Import(
            "local",
            "local",
            "hal-yolu",
            GeoEntityType.Road,
            "Hal Yolu",
            """{"type":"LineString","coordinates":[[38.29,38.34],[38.31,38.35]]}""",
            null,
            "MBB-YOL-HALYOLU",
            new GeoBoundingBox(38.29, 38.34, 38.31, 38.35),
            Now);
}
