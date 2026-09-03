using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Search.Domain.Documents;
namespace Mbb.Archive.Modules.Search.UnitTests;

/// <summary>
/// Aynı belge için ikinci projeksiyon olayı (ör. processing.ready-for-index)
/// mevcut indeks isteğini tazelemelidir. Repository yalnız change tracker'a
/// bakınca yeni scope'ta ikinci kayıt eklenip PK çakışması oluşuyordu; bu
/// testler tazeleme sözleşmesinin beklendiği gibi kaldığını korur.
/// </summary>
[TestClass] public sealed class SearchIndexRequestTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 3, 12, 0, 0, TimeSpan.Zero);

    [TestMethod] public void ProcessingUpdate_RaisesRevisionAboveCreation()
    {
        var document = SearchDocument.Create(Guid.CreateVersion7(), "Şartname", Now);
        var afterCreate = document.Revision;

        document.ApplyProcessing(
            Guid.CreateVersion7(),
            "application/pdf",
            "artifacts/sha256/aa/bb/text.txt",
            "artifacts/sha256/cc/dd/ocr.json",
            Now.AddSeconds(5));

        Assert.IsTrue(
            document.Revision > afterCreate,
            "İndeks isteğinin tazelenmesi revizyonun artmasına bağlıdır.");
    }

    [TestMethod] public void ProcessingUpdate_KeepsTextArtifactKey()
    {
        var document = SearchDocument.Create(Guid.CreateVersion7(), "Şartname", Now);

        document.ApplyProcessing(
            Guid.CreateVersion7(),
            "application/pdf",
            "artifacts/sha256/aa/bb/text.txt",
            "artifacts/sha256/cc/dd/ocr.json",
            Now.AddSeconds(5));

        Assert.AreEqual("artifacts/sha256/aa/bb/text.txt", document.TextArtifactStorageKey);
        Assert.AreEqual("artifacts/sha256/cc/dd/ocr.json", document.OcrJsonArtifactStorageKey);
    }
}
