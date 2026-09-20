using Mbb.Archive.Hosting;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Mbb.Archive.BuildingBlocks.UnitTests;

[TestClass]
public sealed class LocalStoragePathsTests
{
    [TestMethod]
    public void DevelopmentLaunchDirectories_ResolveSameOriginalAndStagingRoots()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var project = Path.Combine(root, "src", "Host", "Api");
        var binaries = Path.Combine(project, "bin", "Debug", "net10.0");
        Directory.CreateDirectory(binaries);
        File.WriteAllText(Path.Combine(root, "Mbb.Archive.slnx"), "<Solution />");
        try
        {
            foreach (var directory in new[] { root, project, binaries })
                foreach (var kind in new[] { "originals", "staging", "artifacts" })
                    Assert.AreEqual(Path.Combine(root, ".local-data", kind),
                        LocalStoragePaths.Resolve($"./.local-data/{kind}", directory, binaries, true));
            Assert.AreEqual(Path.Combine(project, ".local-data", "originals"),
                LocalStoragePaths.Resolve("./.local-data/originals", project, binaries, false));
            Assert.AreEqual(Path.Combine(project, "custom"),
                LocalStoragePaths.Resolve("custom", project, binaries, true));
            var absolute = Path.Combine(root, "mounted-originals");
            Assert.AreEqual(absolute, LocalStoragePaths.Resolve(absolute, project, binaries, true));
        }
        finally { Directory.Delete(root, true); }
    }
}
