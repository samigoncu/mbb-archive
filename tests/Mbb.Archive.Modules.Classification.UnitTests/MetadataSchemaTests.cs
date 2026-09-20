using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Domain.Metadata;
namespace Mbb.Archive.Modules.Classification.UnitTests;

[TestClass]
public sealed class MetadataSchemaTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 2, 9, 0, 0, TimeSpan.Zero);
    [TestMethod]
    public void PublishedSchema_CanAddFields_And_SafeUpdatesWork()
    {
        var schema = MetadataSchema.Create("imar-ruhsat", "İmar Ruhsat", 1, Now);
        var f1 = schema.AddField("ada", "Ada", MetadataFieldType.Text, true, true, false, null);
        schema.Publish(Now);

        // Yeni alan ekleme yayımlanmış şemada serbesttir
        var f2 = schema.AddField("parsel", "Parsel", MetadataFieldType.Text, true, true, false, null);
        Assert.IsNotNull(f2);

        // Görünen ad güncelleme serbesttir
        schema.UpdateField(f1.Id, "Ada No", MetadataFieldType.Text, true, true, false, null);

        // Veri türünü değiştirme engellenir
        Assert.ThrowsExactly<DomainRuleViolationException>(() =>
            schema.UpdateField(f1.Id, "Ada No", MetadataFieldType.Integer, true, true, false, null));

        // Taslağa geri alma çalışır
        schema.RevertToDraft();
        Assert.AreEqual(MetadataSchemaStatus.Draft, schema.Status);
    }
    [TestMethod] public void EmptySchema_CannotBePublished() { var schema = MetadataSchema.Create("x", "X", 1, Now); Assert.ThrowsExactly<DomainRuleViolationException>(() => schema.Publish(Now)); }
}
