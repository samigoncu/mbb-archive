using System.Buffers.Binary;
using System.IO.Compression;
using System.Text;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Worker.SecurityScan;

namespace Mbb.Archive.Worker.SecurityScan.UnitTests;

[TestClass]
public sealed class FileSignatureDetectorTests
{
    private readonly FileSignatureDetector _detector = new();

    [TestMethod]
    [DataRow("text")]
    [DataRow("spreadsheet")]
    [DataRow("presentation")]
    public async Task Detects_opendocument_from_container_mimetype(string kind)
    {
        using var stream = new MemoryStream();
        var mime = "application/vnd.oasis.opendocument." + kind;
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            using (var writer = new StreamWriter(archive.CreateEntry("mimetype").Open())) writer.Write(mime);
            using (var writer = new StreamWriter(archive.CreateEntry("content.xml").Open())) writer.Write("<document />");
        }
        Assert.AreEqual(mime, await DetectAsync(stream.ToArray()));
    }

    [TestMethod]
    public async Task Detects_pdf()
        => Assert.AreEqual(
            "application/pdf",
            await DetectAsync(Encoding.ASCII.GetBytes("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n")));

    [TestMethod]
    public async Task Detects_docx_instead_of_generic_zip()
        => Assert.AreEqual(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            await DetectAsync(CreateOpenXml("word/document.xml")));

    [TestMethod]
    public async Task Detects_xlsx_instead_of_generic_zip()
        => Assert.AreEqual(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            await DetectAsync(CreateOpenXml("xl/workbook.xml")));

    [TestMethod]
    public async Task Detects_pptx_instead_of_generic_zip()
        => Assert.AreEqual(
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            await DetectAsync(CreateOpenXml("ppt/presentation.xml")));

    /// <summary>
    /// OOXML olmayan bir arşiv Office belgesi gibi etiketlenmemelidir.
    /// </summary>
    [TestMethod]
    public async Task Keeps_plain_zip_as_zip()
        => Assert.AreEqual(
            "application/zip",
            await DetectAsync(CreateOpenXml("notes/readme.txt")));

    [TestMethod]
    public async Task Detects_legacy_word_document()
        => Assert.AreEqual(
            "application/msword",
            await DetectAsync(CreateCompoundFile("WordDocument")));

    [TestMethod]
    public async Task Detects_legacy_excel_workbook()
        => Assert.AreEqual(
            "application/vnd.ms-excel",
            await DetectAsync(CreateCompoundFile("Workbook")));

    [TestMethod]
    public async Task Detects_outlook_message()
        => Assert.AreEqual(
            "application/vnd.ms-outlook",
            await DetectAsync(CreateCompoundFile("__substg1.0_0037001F")));

    [TestMethod]
    public async Task Detects_plain_text()
        => Assert.AreEqual(
            "text/plain",
            await DetectAsync(Encoding.UTF8.GetBytes("Kurum;Yıl;Adet\nMBB;2026;12\n")));

    [TestMethod]
    public async Task Detects_email_message()
    {
        const string eml =
            "Return-Path: <yazi@mbb.gov.tr>\r\n" +
            "From: Yazı İşleri <yazi@mbb.gov.tr>\r\n" +
            "Subject: UKOME\r\n" +
            "\r\n" +
            "Ek: karar.pdf\r\n";

        Assert.AreEqual("message/rfc822", await DetectAsync(Encoding.UTF8.GetBytes(eml)));
    }

    /// <summary>
    /// Tanınmayan ikili içerik reddedilebilmesi için null dönmelidir; ingestion
    /// bu durumda unsupported_signature ile durur.
    /// </summary>
    [TestMethod]
    public async Task Returns_null_for_unknown_binary()
        => Assert.IsNull(await DetectAsync([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]));

    [TestMethod]
    public async Task Returns_null_for_empty_file()
        => Assert.IsNull(await DetectAsync([]));

    /// <summary>
    /// Tespit akışın konumunu değiştirmemeli; ClamAV taraması aynı akış
    /// üzerinden baştan okur.
    /// </summary>
    [TestMethod]
    public async Task Restores_stream_position()
    {
        using var stream = new MemoryStream(CreateOpenXml("word/document.xml"));
        stream.Position = 0;

        await _detector.DetectAsync(stream, CancellationToken.None);

        Assert.AreEqual(0, stream.Position);
    }

    private async Task<string?> DetectAsync(byte[] content)
    {
        using var stream = new MemoryStream(content);
        return await _detector.DetectAsync(stream, CancellationToken.None);
    }

    private static byte[] CreateOpenXml(string entryName)
    {
        using var buffer = new MemoryStream();

        using (var archive = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
        {
            using (var contentTypes = archive.CreateEntry("[Content_Types].xml").Open())
                contentTypes.Write("<Types />"u8);

            using (var entry = archive.CreateEntry(entryName).Open())
                entry.Write("<root />"u8);
        }

        return buffer.ToArray();
    }

    /// <summary>
    /// Tek dizin girişi taşıyan asgari OLE Compound File üretir.
    /// </summary>
    private static byte[] CreateCompoundFile(string streamName)
    {
        const int sectorSize = 512;

        var content = new byte[sectorSize * 2];

        ReadOnlySpan<byte> signature =
            [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];

        signature.CopyTo(content);

        // Sector shift 9 => 512 bayt sektör.
        BinaryPrimitives.WriteUInt16LittleEndian(content.AsSpan(30, 2), 9);

        // Dizin sektörü 0 => dosya içinde 512. bayttan başlar.
        BinaryPrimitives.WriteUInt32LittleEndian(content.AsSpan(48, 4), 0);

        var name = Encoding.Unicode.GetBytes(streamName);
        name.CopyTo(content, sectorSize);

        BinaryPrimitives.WriteUInt16LittleEndian(
            content.AsSpan(sectorSize + 64, 2),
            (ushort)(name.Length + 2));

        return content;
    }
}
