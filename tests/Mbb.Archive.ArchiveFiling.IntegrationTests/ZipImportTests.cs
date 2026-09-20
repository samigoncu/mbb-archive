using System.IO.Compression;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Documents.Application.Dossiers;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;
[TestClass]
public class ZipImportTests
{
    private static MemoryStream Zip(params (string Name, string Content)[] files)
    {
        var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
            foreach (var file in files) { using var writer = new StreamWriter(zip.CreateEntry(file.Name).Open()); writer.Write(file.Content); }
        stream.Position = 0; return stream;
    }
    [TestMethod] public async Task PreservesEachFileAndRelativePath()
    {
        using var zip = Zip(("alt/a.pdf", "%PDF-test"), ("b.png", "test"));
        var files = await ZipImportReader.ReadAsync(zip, default);
        Assert.AreEqual(2, files.Count); Assert.AreEqual("alt/a.pdf", files[0].Path);
        Assert.AreEqual("a.pdf", files[0].FileName);Assert.AreEqual("%PDF-test", System.Text.Encoding.UTF8.GetString(files[0].Content));
    }
    [TestMethod] public async Task RejectsTraversalNestedArchivesAndDuplicateNames()
    {
        foreach (var path in new[]{"../x.pdf", "/x.pdf", "a/../../x.pdf", "a.zip", "a.exe"})
        { using var zip=Zip((path,"test"));await Assert.ThrowsAsync<InvalidDataException>(()=>ZipImportReader.ReadAsync(zip,default)); }
        using var duplicate=Zip(("a.pdf","test"),("A.pdf","other"));
        await Assert.ThrowsAsync<InvalidDataException>(()=>ZipImportReader.ReadAsync(duplicate,default));
    }
    [TestMethod] public async Task RejectsExpandedSizeBeforeCreatingAnyFiles()
    {
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            using var entry = zip.CreateEntry("large.pdf", CompressionLevel.Fastest).Open();
            var chunk = new byte[1024 * 1024];
            for (var i=0;i<201;i++) await entry.WriteAsync(chunk);
        }
        stream.Position=0;
        await Assert.ThrowsAsync<InvalidDataException>(()=>ZipImportReader.ReadAsync(stream,default));
    }
    [TestMethod] public async Task RejectsTooManyEntries()
    {
        using var zip=Zip(Enumerable.Range(0,101).Select(i=>($"{i}.pdf","test")).ToArray());
        await Assert.ThrowsAsync<InvalidDataException>(()=>ZipImportReader.ReadAsync(zip,default));
    }
}
