using System.Text.Json;

namespace Mbb.Archive.Modules.Operations.Application.Siem;

public enum SiemFormat { Cef, JsonLines, StructuredJson }
public sealed record SiemEvent(string EventType, DateTimeOffset OccurredAt, string Outcome,
    string Severity, string? Subject, string? SourceAddress, IReadOnlyDictionary<string, string> Attributes);

public interface ISiemExporter
{
    SiemFormat Format { get; }
    Task ExportAsync(SiemEvent securityEvent, CancellationToken cancellationToken);
}

public static class SiemEventSerializer
{
    private static readonly HashSet<string> Forbidden = new(StringComparer.OrdinalIgnoreCase)
    { "content", "ocrText", "password", "token", "tckn", "filename", "authorization" };

    public static string ToJsonLine(SiemEvent value)
    {
        var minimized = value with
        {
            Subject = MinimizeSubject(value.Subject),
            Attributes = value.Attributes.Where(x => !Forbidden.Contains(x.Key))
                .ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal)
        };
        return JsonSerializer.Serialize(minimized) + "\n";
    }

    public static string ToCef(SiemEvent value)
    {
        var extension = string.Join(" ", value.Attributes.Where(x => !Forbidden.Contains(x.Key))
            .OrderBy(x => x.Key).Select(x => $"{Escape(x.Key)}={Escape(x.Value)}"));
        return $"CEF:0|MBB|Archive|1.4|{Escape(value.EventType)}|{Escape(value.EventType)}|{Severity(value.Severity)}|outcome={Escape(value.Outcome)} {extension}".TrimEnd();
    }

    private static string? MinimizeSubject(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : Convert.ToHexString(
            System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
    private static string Escape(string value) => value.Replace("\\", "\\\\", StringComparison.Ordinal)
        .Replace("=", "\\=", StringComparison.Ordinal).Replace("|", "\\|", StringComparison.Ordinal)
        .Replace("\n", " ", StringComparison.Ordinal).Replace("\r", " ", StringComparison.Ordinal);
    private static int Severity(string value) => value.ToLowerInvariant() switch { "critical" => 10, "warning" => 6, _ => 3 };
}
