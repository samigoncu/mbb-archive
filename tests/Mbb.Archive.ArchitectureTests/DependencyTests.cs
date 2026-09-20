using System.Xml.Linq;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Mbb.Archive.ArchitectureTests;

/// <summary>
/// Katman ve modül sınırlarını tüm modüller için doğrular.
/// </summary>
/// <remarks>
/// <para>
/// Önceden yalnız Documents modülünün derlenmiş assembly'sine bakılıyordu;
/// diğer yirmi modül kuralı ihlal etse test yeşil kalırdı — "mimari testi var"
/// yanılsaması, testin yokluğundan daha tehlikelidir.
/// </para>
/// <para>
/// Proje dosyaları okunur, assembly değil: kural derlemeden önce, referans
/// eklendiği anda bozulur ve hata orada görünmelidir.
/// </para>
/// </remarks>
[TestClass]
public sealed class DependencyTests
{
    private static readonly string Root = FindRepositoryRoot();

    [TestMethod]
    public void Domain_DoesNotReferenceInfrastructureOrPresentation()
    {
        var violations = Projects(".Domain")
            .SelectMany(project => References(project)
                .Where(target => target.Contains(".Infrastructure", StringComparison.Ordinal)
                    || target.Contains(".Presentation", StringComparison.Ordinal))
                .Select(target => $"{Name(project)} → {target}"))
            .ToArray();

        Assert.AreEqual(0, violations.Length, string.Join("\n", violations));
    }

    [TestMethod]
    public void Application_DoesNotReferenceInfrastructureOrPresentation()
    {
        var violations = Projects(".Application")
            .SelectMany(project => References(project)
                .Where(target => target.Contains(".Infrastructure", StringComparison.Ordinal)
                    || target.Contains(".Presentation", StringComparison.Ordinal))
                .Select(target => $"{Name(project)} → {target}"))
            .ToArray();

        Assert.AreEqual(0, violations.Length, string.Join("\n", violations));
    }

    [TestMethod]
    public void Domain_DoesNotReferencePersistenceOrWebPackages()
    {
        string[] forbidden =
            ["Microsoft.EntityFrameworkCore", "Microsoft.AspNetCore", "Npgsql", "RabbitMQ", "OpenSearch"];

        var violations = Projects(".Domain")
            .SelectMany(project => Packages(project)
                .Where(package => forbidden.Any(x => package.StartsWith(x, StringComparison.Ordinal)))
                .Select(package => $"{Name(project)} → {package}"))
            .ToArray();

        Assert.AreEqual(0, violations.Length, string.Join("\n", violations));
    }

    /// <summary>Modüller birbirine yalnız Contracts üzerinden bakabilir.</summary>
    [TestMethod]
    public void Modules_CrossReferenceOnlyThroughContracts()
    {
        var violations = new List<string>();

        foreach (var project in Projects(""))
        {
            var source = ModuleOf(project);
            if (source is null) continue;

            foreach (var target in ReferencePaths(project))
            {
                var referenced = ModuleOf(target);

                if (referenced is not null
                    && !string.Equals(referenced, source, StringComparison.Ordinal)
                    && !Path.GetFileNameWithoutExtension(target).Contains(".Contracts", StringComparison.Ordinal))
                {
                    violations.Add($"{source} → {referenced} ({Path.GetFileNameWithoutExtension(target)})");
                }
            }
        }

        Assert.AreEqual(0, violations.Count, string.Join("\n", violations));
    }

    [TestMethod]
    public void EveryModuleIsCovered()
    {
        // Kapsam kendiliğinden büyümeli: yeni modül eklendiğinde testin
        // onu gördüğünden emin olmak için modül sayısı doğrulanır.
        var modules = Projects("")
            .Select(ModuleOf)
            .Where(x => x is not null)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        Assert.IsTrue(modules.Length >= 15, $"Beklenenden az modül tarandı: {modules.Length}.");
        Assert.IsTrue(Projects(".Domain").Length >= 10, "Domain projeleri bulunamadı; kök yolu yanlış olabilir.");
    }

    private static string[] Projects(string suffix)
        => Directory
            .EnumerateFiles(Path.Combine(Root, "src"), "*.csproj", SearchOption.AllDirectories)
            .Where(path => Path.GetFileNameWithoutExtension(path).Contains(suffix, StringComparison.Ordinal))
            .ToArray();

    private static string Name(string project) => Path.GetFileNameWithoutExtension(project);

    private static IEnumerable<string> References(string project)
        => ReferencePaths(project).Select(Path.GetFileNameWithoutExtension)!;

    private static IEnumerable<string> ReferencePaths(string project)
        => XDocument.Load(project)
            .Descendants("ProjectReference")
            .Select(element => (string?)element.Attribute("Include"))
            .Where(include => !string.IsNullOrWhiteSpace(include))
            .Select(include => Path.GetFullPath(Path.Combine(Path.GetDirectoryName(project)!, include!)));

    private static IEnumerable<string> Packages(string project)
        => XDocument.Load(project)
            .Descendants("PackageReference")
            .Select(element => (string?)element.Attribute("Include") ?? "")
            .Where(include => include.Length > 0);

    /// <summary>src/Modules/&lt;Ad&gt;/… yolundaki modül adı; modül dışıysa null.</summary>
    private static string? ModuleOf(string projectPath)
    {
        var relative = Path.GetRelativePath(Root, projectPath).Replace('\\', '/');
        var parts = relative.Split('/');

        return parts.Length > 2 && parts[0] == "src" && parts[1] == "Modules" ? parts[2] : null;
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "Mbb.Archive.slnx")))
            directory = directory.Parent;

        Assert.IsNotNull(directory, "Depo kökü bulunamadı.");
        return directory!.FullName;
    }
}
