using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Geo.Domain.Entities;
namespace Mbb.Archive.Modules.Geo.UnitTests;
[TestClass]
public sealed class GeoEntityLifecycleTests
{
    [TestMethod]
    public void RetiringEntityPreservesGeometryAndRejectsNewRelations()
    {
        var entity = Create();
        var geometry = entity.GeoJson;
        entity.SetActive(false);
        Assert.IsFalse(entity.IsActive);
        Assert.AreEqual(geometry, entity.GeoJson);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => entity.RegisterRelationChange());
        entity.SetActive(true);
        entity.RegisterRelationChange();
        Assert.IsTrue(entity.IsActive);
    }
    [TestMethod]
    public void RelationCreationParticipatesInEntityConcurrency()
    {
        var entity = Create();
        var previous = entity.ConcurrencyVersion;
        entity.RegisterRelationChange();
        Assert.AreEqual(previous + 1, entity.ConcurrencyVersion);
    }
    private static GeoEntity Create() => GeoEntity.Import("local", "test", "test-1", GeoEntityType.Road,
        "Test", """{"type":"Point","coordinates":[1,2]}""", null, null,
        new GeoBoundingBox(1, 2, 1, 2), DateTimeOffset.UtcNow);
}
