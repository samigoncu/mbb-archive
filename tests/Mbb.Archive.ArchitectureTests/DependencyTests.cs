using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.ArchitectureTests;

[TestClass]
public sealed class DependencyTests
{
    [TestMethod]
    public void DocumentsDomain_DoesNotReferenceInfrastructure()
    {
        var references = typeof(Document)
            .Assembly
            .GetReferencedAssemblies()
            .Select(x => x.Name ?? string.Empty)
            .ToArray();

        Assert.IsFalse(
            references.Any(x => x.Contains(".Infrastructure", StringComparison.Ordinal)),
            "Domain assembly must not reference Infrastructure.");
    }

    [TestMethod]
    public void DocumentsDomain_DoesNotReferenceAspNetCore()
    {
        var references = typeof(Document)
            .Assembly
            .GetReferencedAssemblies()
            .Select(x => x.Name ?? string.Empty)
            .ToArray();

        Assert.IsFalse(
            references.Any(x => x.StartsWith("Microsoft.AspNetCore", StringComparison.Ordinal)),
            "Domain assembly must not reference ASP.NET Core.");
    }

    [TestMethod]
    public void DocumentsDomain_DoesNotReferenceEntityFrameworkCore()
    {
        var references = typeof(Document)
            .Assembly
            .GetReferencedAssemblies()
            .Select(x => x.Name ?? string.Empty)
            .ToArray();

        Assert.IsFalse(
            references.Any(x => x.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal)),
            "Domain assembly must not reference EF Core.");
    }
}
