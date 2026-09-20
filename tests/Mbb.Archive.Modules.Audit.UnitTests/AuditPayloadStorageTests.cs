using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Audit.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Audit.UnitTests;

[TestClass]
public sealed class AuditPayloadStorageTests
{
    /// <summary>
    /// Girdi hash'i yayınlanan yükün baytları üzerinden hesaplanır. jsonb
    /// sütunu anahtarları yeniden sıralayıp boşlukları normalize ettiği için
    /// geri okunan metin farklılaşır ve zincir doğrulaması "mismatch" verir.
    /// Bu yüzden yük düz metin olarak saklanmalıdır.
    /// </summary>
    [TestMethod]
    public void Payload_IsStoredVerbatimAsText()
    {
        using var context = CreateContext();

        var columnType = context.Model
            .FindEntityType(typeof(AuditEntry))!
            .FindProperty(nameof(AuditEntry.Payload))!
            .GetColumnType();

        Assert.AreEqual("text", columnType);
    }

    [TestMethod]
    public void Sequence_IsThePrimaryKeyOfTheChain()
    {
        using var context = CreateContext();

        var key = context.Model
            .FindEntityType(typeof(AuditEntry))!
            .FindPrimaryKey()!
            .Properties
            .Single();

        Assert.AreEqual(nameof(AuditEntry.Sequence), key.Name);
    }

    /// <summary>
    /// Aynı mesajın iki kez tüketilmesi ikinci bir halka eklememeli; bu
    /// benzersizlik idempotency'nin veritabanı tarafındaki güvencesidir.
    /// </summary>
    [TestMethod]
    public void MessageId_IsUnique()
    {
        using var context = CreateContext();

        var index = context.Model
            .FindEntityType(typeof(AuditEntry))!
            .GetIndexes()
            .Single(x => x.Properties.Any(p => p.Name == nameof(AuditEntry.MessageId)));

        Assert.IsTrue(index.IsUnique);
    }

    private static AuditDbContext CreateContext()
    {
        // Model oluşturmak için bağlantı açılmaz; yalnızca eşleme incelenir.
        var options = new DbContextOptionsBuilder<AuditDbContext>()
            .UseNpgsql("Host=localhost;Database=model-only")
            .Options;

        return new AuditDbContext(options);
    }
}
