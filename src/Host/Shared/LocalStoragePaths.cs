using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Mbb.Archive.Hosting;

/// <summary>Resolve storage once at startup, independently of the process working directory.</summary>
internal static class LocalStoragePaths
{
    public static void Configure(IConfiguration configuration, IHostEnvironment environment)
    {
        var paths = new Dictionary<string, string>
        {
            ["Documents:OriginalStorage:LocalRootPath"] = "./.local-data/originals",
            ["Documents:FileStaging:RootPath"] = "./.local-data/staging",
            ["Processing:Artifacts:LocalRootPath"] = "./.local-data/artifacts",
            ["Search:Artifacts:LocalRootPath"] = "./.local-data/artifacts",
            ["SecurityScan:StagingRootPath"] = "./.local-data/staging",
            // Sır şifreleme anahtarları da aynı kuralla çözülür: geliştirmede
            // depo köküne, dağıtımda verilen mutlak yola. Farklı çözülseydi,
            // uygulamayı başka dizinden başlatmak sırları "bozuk" gösterirdi.
            ["DataProtection:KeyRingPath"] = "./.local-data/keys"
        };
        foreach (var (key, fallback) in paths)
            configuration[key] = Resolve(configuration[key] ?? fallback,
                environment.ContentRootPath, AppContext.BaseDirectory, environment.IsDevelopment());
    }

    internal static string Resolve(string path, string contentRoot, string applicationBase, bool development)
    {
        if (Path.IsPathFullyQualified(path)) return Path.GetFullPath(path);
        var normalized = path.Replace('\\', '/');
        if (normalized.StartsWith("./", StringComparison.Ordinal)) normalized = normalized[2..];
        // Only the development default is repository-relative. Explicit deployment paths win.
        if (development && normalized.StartsWith(".local-data/", StringComparison.Ordinal))
        {
            for (var directory = new DirectoryInfo(applicationBase); directory is not null; directory = directory.Parent)
                if (File.Exists(Path.Combine(directory.FullName, "Mbb.Archive.slnx")))
                    return Path.GetFullPath(path, directory.FullName);
        }
        return Path.GetFullPath(path, contentRoot);
    }
}
