using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Worker.SecurityScan;
namespace Mbb.Archive.Worker.SecurityScan.UnitTests;
[TestClass]
public sealed class ClamAvLimitTests
{
    [TestMethod] public void StreamAndExpandedScanLimitsNeverPassAsClean()
    {
        var stream = ClamAvScanResult.Parse("INSTREAM size limit exceeded. ERROR");
        Assert.IsFalse(stream.IsClean);
        Assert.AreEqual("Heuristics.Limits.Exceeded.StreamMaxLength", stream.ThreatName);
        Assert.IsFalse(ClamAvScanResult.Parse("stream: Heuristics.Limits.Exceeded.MaxScanSize FOUND").IsClean);
        Assert.IsTrue(ClamAvScanResult.Parse("stream: OK").IsClean);
    }
}
