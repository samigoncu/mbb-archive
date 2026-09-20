using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Search.Domain.Documents;
namespace Mbb.Archive.Modules.Search.UnitTests;
[TestClass]
public sealed class RefilingSearchTests
{
    [TestMethod]
    public void ChangingPrimaryClassification_RemovesOldPrimaryFromSearch()
    {
        var doc = SearchDocument.Create(Guid.NewGuid(), "Belge", DateTimeOffset.UtcNow);
        doc.UpsertClassification("SDP", "Plan", "010", "Eski konu", true, DateTimeOffset.UtcNow);
        doc.UpsertClassification("SDP", "Plan", "050", "İkincil konu", false, DateTimeOffset.UtcNow);
        doc.UpsertClassification("SDP", "Plan", "020", "Yeni konu", true, DateTimeOffset.UtcNow);
        Assert.IsFalse(doc.ClassificationJson.Contains("010", StringComparison.Ordinal));
        StringAssert.Contains(doc.ClassificationJson, "020");
        StringAssert.Contains(doc.ClassificationJson, "050");
    }
}
