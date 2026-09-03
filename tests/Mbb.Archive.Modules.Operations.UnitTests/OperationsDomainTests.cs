using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Operations.Domain.Recovery;
using Mbb.Archive.Modules.Operations.Domain.Verifications;

namespace Mbb.Archive.Modules.Operations.UnitTests;

[TestClass]
public sealed class OperationsDomainTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 9, 2, 18, 30, 0, TimeSpan.Zero);

    [TestMethod]
    public void VerificationRun_CannotCompleteTwice()
    {
        var run = VerificationRun.Start(
            "integrity",
            "operator",
            Now);

        run.Complete(
            VerificationRunStatus.Passed,
            10,
            0,
            "OK",
            "[]",
            Now.AddSeconds(1));

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => run.Complete(
                VerificationRunStatus.Passed,
                10,
                0,
                "OK",
                "[]",
                Now.AddSeconds(2)));
    }

    [TestMethod]
    public void RecoveryDrill_RecordsActualRpoAndRto()
    {
        var drill = RecoveryDrill.Plan(
            "backup-20260902",
            "isolated-restore",
            15,
            60,
            "operator",
            Now);

        drill.Start(Now.AddMinutes(1));
        drill.Complete(
            true,
            8,
            42,
            "evidence://restore/20260902",
            "Restore and smoke tests passed.",
            Now.AddMinutes(43));

        Assert.AreEqual(RecoveryDrillStatus.Passed, drill.Status);
        Assert.AreEqual(8, drill.ActualRpoMinutes);
        Assert.AreEqual(42, drill.ActualRtoMinutes);
    }
}
