using System.IO.Compression;
namespace Mbb.Archive.Modules.Documents.Application.Dossiers;

public sealed record ZipImportFile(string Path, string FileName, string ContentType, byte[] Content);
public static class ZipImportReader
{
    public const long MaxBytes = 200L * 1024 * 1024;
    public const int MaxFiles = 100;
    public static async Task<IReadOnlyList<ZipImportFile>> ReadAsync(Stream source, CancellationToken ct)
    {
        using var buffer = new MemoryStream();
        await CopyLimited(source, buffer, MaxBytes, ct);
        buffer.Position = 0;
        using var zip = new ZipArchive(buffer, ZipArchiveMode.Read);
        if (zip.Entries.Count > 1000) throw new InvalidDataException("ZIP çok fazla kayıt içeriyor.");
        var entries = zip.Entries.Where(e => !e.FullName.EndsWith('/')).ToArray();
        if (entries.Length is 0 or > MaxFiles) throw new InvalidDataException("ZIP 1–100 dosya içermelidir.");
        var result = new List<ZipImportFile>();
        long total = 0;
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var entry in entries)
        {
            var path = entry.FullName.Replace('\\', '/');
            if (path.StartsWith('/') || path.Contains(':') || path.Split('/').Any(p => p is ".." or "." or "") || path.Length > 300 || path.Any(char.IsControl) || !names.Add(path))
                throw new InvalidDataException("ZIP içinde geçersiz veya yinelenen dosya yolu var.");
            if (entry.Length <= 0 || entry.Length > MaxBytes - total) throw new InvalidDataException("Açılmış dosyaların toplamı 200 MB sınırını aşıyor veya boş dosya var.");
            var type = ContentType(path);
            using var content = new MemoryStream();
            await using var stream = entry.Open();
            await CopyLimited(stream, content, Math.Min(entry.Length, MaxBytes - total), ct);
            if (content.Length != entry.Length) throw new InvalidDataException("ZIP dosya boyutu tutarsız.");
            total += content.Length;
            result.Add(new(path, path.Split('/')[^1], type, content.ToArray()));
        }
        return result;
    }
    private static async Task CopyLimited(Stream source, Stream target, long limit, CancellationToken ct)
    {
        var chunk = new byte[81920]; long total = 0; int read;
        while ((read = await source.ReadAsync(chunk, ct)) > 0)
        {
            total += read;
            if (total > limit) throw new InvalidDataException("ZIP boyut sınırı aşıldı.");
            await target.WriteAsync(chunk.AsMemory(0, read), ct);
        }
    }
    private static string ContentType(string path) => System.IO.Path.GetExtension(path).ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf", ".png" => "image/png", ".jpg" or ".jpeg" => "image/jpeg", ".tif" or ".tiff" => "image/tiff",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".doc" => "application/msword", ".xls" => "application/vnd.ms-excel", ".ppt" => "application/vnd.ms-powerpoint",
        ".odt" => "application/vnd.oasis.opendocument.text", ".ods" => "application/vnd.oasis.opendocument.spreadsheet", ".odp" => "application/vnd.oasis.opendocument.presentation",
        _ => throw new InvalidDataException("ZIP yalnız PDF, görsel ve desteklenen Office dosyalarını içerebilir; iç içe ZIP desteklenmez.")
    };
}
