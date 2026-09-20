using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Retention.Domain.Cases;
using Mbb.Archive.Modules.Retention.Domain.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.UnitTests;

[TestClass]
public sealed class DispositionProcessTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 5, 0, 0, 0, TimeSpan.Zero);
    private static RetentionCase Case(DispositionAction action = DispositionAction.Transfer, int months = 1)
        => RetentionCase.Schedule(Guid.NewGuid(), Guid.NewGuid(), RetentionRule.Create("R1", "Kural", months, action, Now.AddYears(-1)), Now.AddMonths(-2));
    private static DispositionProcess Draft(RetentionCase item, DispositionAction action = DispositionAction.Transfer)
    {
        var process = DispositionProcess.Create(Guid.NewGuid(), item, action, "Devir gerekçesi", "Komisyon 2026/1", "preparer", 2, Now);
        process.ConfigureCommission("commission-manager", ["reviewer", "reviewer-1", "reviewer-2"], Now.AddDays(-1), Now.AddYears(1));
        return process;
    }
    private static DispositionProcess Approved(RetentionCase item, DispositionAction action = DispositionAction.Transfer)
    {
        var process = Draft(item, action);
        process.Submit("preparer", item, Now);
        process.Review("reviewer-1", true, "Uygun", item, Now);
        process.Review("reviewer-2", true, "Uygun", item, Now);
        process.Approve("approver", "Onay 2026/1", item, Now);
        if (action == DispositionAction.Transfer)
        {
            var packageId = Guid.NewGuid();
            process.RegisterTransferPackage(packageId, "{}", new string('a', 64), new string('b', 64), 10, "preparer", item, Now);
            process.VerifyTransferPackage(packageId, "receiver", item, Now);
        }
        return process;
    }

    [TestMethod] public void Transfer_RequiresIndependentReviewsApprovalAndReceipt()
    {
        var item = Case(); var process = Approved(item);
        process.AcceptTransfer("receiver", "Kurum Arşivi", "Tutanak 2026/1", item, Now);
        Assert.AreEqual(DispositionProcessStatus.Completed, process.Status);
        Assert.AreEqual(RetentionCaseStatus.Completed, item.Status);
        Assert.AreEqual("receiver", process.CompletedBy);
        Assert.AreEqual("Tutanak 2026/1", process.ReceiptReference);
        Assert.AreEqual(2, process.Reviews.Count);
    }
    [TestMethod] public void Preparer_CannotReviewOwnProcess()
    {
        var item = Case(); var process = Draft(item); process.Submit("preparer", item, Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Review("preparer", true, "Uygun", item, Now));
    }
    [TestMethod] public void Reviewer_CannotVoteTwice()
    {
        var item = Case(); var process = Draft(item); process.Submit("preparer", item, Now);
        process.Review("reviewer", true, "Uygun", item, Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Review("reviewer", true, "Uygun", item, Now));
        Assert.AreEqual(DispositionProcessStatus.UnderReview, process.Status);
    }
    [TestMethod] public void OneVote_DoesNotAuthorizeFinalApproval()
    {
        var item = Case(); var process = Draft(item); process.Submit("preparer", item, Now);
        process.Review("reviewer", true, "Uygun", item, Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Approve("approver", "Onay", item, Now));
    }
    [TestMethod] public void Reviewer_CannotGiveFinalApproval()
    {
        var item = Case(); var process = Draft(item); process.Submit("preparer", item, Now);
        process.Review("reviewer-1", true, "Uygun", item, Now); process.Review("reviewer-2", true, "Uygun", item, Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Approve("reviewer-1", "Onay", item, Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Approve("preparer", "Onay", item, Now));
    }
    [TestMethod] public void Rejection_PreservesReasonAndStopsApproval()
    {
        var item = Case(); var process = Draft(item); process.Submit("preparer", item, Now);
        process.Review("reviewer", false, "Eksik evrak", item, Now);
        Assert.AreEqual(DispositionProcessStatus.Rejected, process.Status);
        Assert.AreEqual("Eksik evrak", process.Reviews.Single().Reason);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Approve("approver", "Onay", item, Now));
    }
    [TestMethod] public void LateHold_BlocksAlreadyApprovedTransfer()
    {
        var item = Case(); var process = Approved(item); item.PlaceHold();
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.AcceptTransfer("receiver", "Arşiv", "Tutanak", item, Now));
        Assert.AreEqual(DispositionProcessStatus.Approved, process.Status);
        Assert.AreEqual(RetentionCaseStatus.Held, item.Status);
    }
    [TestMethod] public void Hold_BlocksSubmissionAndCreation()
    {
        var item = Case(); var process = Draft(item); item.PlaceHold();
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Submit("preparer", item, Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => Draft(item));
    }
    [TestMethod] public void UnexpiredOrPermanentCases_CannotBeDisposed()
    {
        Assert.ThrowsExactly<DomainRuleViolationException>(() => Draft(Case(months: 12)));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => Draft(Case(DispositionAction.KeepPermanent)));
    }
    [TestMethod] public void TransferPolicy_CannotBeChangedIntoDestructionPermission()
    {
        Assert.ThrowsExactly<DomainRuleViolationException>(() => Draft(Case(), DispositionAction.Destroy));
    }
    [TestMethod] public void ApprovedDestruction_CannotMasqueradeAsTransfer()
    {
        var item = Case(DispositionAction.Destroy); var process = Approved(item, DispositionAction.Destroy);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.AcceptTransfer("receiver", "Arşiv", "Tutanak", item, Now));
        Assert.AreEqual(DispositionProcessStatus.Approved, process.Status);
    }
    [TestMethod] public void PermanentDecision_RemovesDueDateWithoutDeletingRecord()
    {
        var item = Case(); var process = Approved(item, DispositionAction.KeepPermanent);
        process.KeepPermanently("executor", item, Now);
        Assert.IsNull(item.DueAt); Assert.AreEqual(DispositionAction.KeepPermanent, item.Action);
        Assert.AreEqual(RetentionCaseStatus.Scheduled, item.Status);
        Assert.AreEqual(DispositionProcessStatus.Completed, process.Status);
        item.PlaceHold(); Assert.AreEqual(1, item.ActiveHoldCount);
    }
    [TestMethod] public void MultipleHolds_RemainingHoldStillBlocksTransfer()
    {
        var item = Case(); var process = Approved(item);
        item.PlaceHold(); item.PlaceHold(); item.ReleaseHold();
        Assert.AreEqual(1, item.ActiveHoldCount);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.AcceptTransfer("receiver", "Arşiv", "Tutanak", item, Now));
        item.ReleaseHold(); process.AcceptTransfer("receiver", "Arşiv", "Tutanak", item, Now);
        Assert.AreEqual(DispositionProcessStatus.Completed, process.Status);
    }
    [TestMethod] public void HoldRelease_RequiresAndPreservesProvenance()
    {
        var hold = LegalHold.Place(Guid.NewGuid(), Guid.NewGuid(), "Dava devam ediyor", "clerk", Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => hold.Release(Now, "", ""));
        hold.Release(Now.AddDays(1), "lawyer", "Dava kesinleşti");
        Assert.AreEqual("lawyer", hold.ReleasedBy); Assert.AreEqual("Dava kesinleşti", hold.ReleaseReason);
    }
    [TestMethod] public void EachAdvance_ChangesRetentionConcurrencyToken()
    {
        var item = Case(); var process = Draft(item); var before = item.ConcurrencyVersion;
        process.Submit("preparer", item, Now); Assert.IsTrue(item.ConcurrencyVersion > before);
    }
    [TestMethod] public void Receiver_CannotBePreparerOrApprover()
    {
        var item = Case(); var process = Approved(item);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.AcceptTransfer("preparer", "Arşiv", "Tutanak", item, Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.AcceptTransfer("approver", "Arşiv", "Tutanak", item, Now));
    }
    [TestMethod] public void ExecuteDestruction_CompletesProcessAndCaseWithProtocolReference()
    {
        var item = Case(DispositionAction.Destroy); var process = Approved(item, DispositionAction.Destroy);
        process.ExecuteDestruction("destroyer", "MBB-İMHA-2026-0001", Guid.NewGuid(), Guid.NewGuid(), new string('a', 64), "Parçalama", "Depo", "Tanık 1, Tanık 2", Now, item, Now);
        Assert.AreEqual(DispositionProcessStatus.Completed, process.Status);
        Assert.AreEqual(RetentionCaseStatus.Scheduled, item.Status);
        Assert.IsTrue(item.DigitalPreservationRequired);
        Assert.AreEqual(DispositionAction.KeepPermanent, item.Action);
        Assert.IsNull(item.DueAt);
        Assert.AreEqual("destroyer", process.CompletedBy);
        Assert.AreEqual("MBB-İMHA-2026-0001", process.ReceiptReference);
    }
    [TestMethod] public void ExecuteDestruction_BlockedByActiveHold()
    {
        var item = Case(DispositionAction.Destroy); var process = Approved(item, DispositionAction.Destroy);
        item.PlaceHold();
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.ExecuteDestruction("destroyer", "MBB-İMHA-2026-0001", Guid.NewGuid(), Guid.NewGuid(), new string('a', 64), "Parçalama", "Depo", "Tanık 1, Tanık 2", Now, item, Now));
        Assert.AreEqual(DispositionProcessStatus.Approved, process.Status);
    }
    [TestMethod] public void ExecuteDestruction_RejectsTransferOrKeepPermanentActions()
    {
        var item = Case(DispositionAction.Transfer); var process = Approved(item, DispositionAction.Transfer);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.ExecuteDestruction("destroyer", "MBB-İMHA-2026-0001", Guid.NewGuid(), Guid.NewGuid(), new string('a', 64), "Parçalama", "Depo", "Tanık 1, Tanık 2", Now, item, Now));
    }
    [TestMethod] public void ExecuteDestruction_ExecutorCannotBePreparerOrApprover()
    {
        var item = Case(DispositionAction.Destroy); var process = Approved(item, DispositionAction.Destroy);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.ExecuteDestruction("preparer", "MBB-İMHA-2026-0001", Guid.NewGuid(), Guid.NewGuid(), new string('a', 64), "Parçalama", "Depo", "Tanık 1, Tanık 2", Now, item, Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.ExecuteDestruction("approver", "MBB-İMHA-2026-0001", Guid.NewGuid(), Guid.NewGuid(), new string('a', 64), "Parçalama", "Depo", "Tanık 1, Tanık 2", Now, item, Now));
    }
}
