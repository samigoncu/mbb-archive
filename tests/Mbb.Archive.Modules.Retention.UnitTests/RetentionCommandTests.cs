using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Retention.Application.Cases.Schedule;
using Mbb.Archive.Modules.Retention.Application.Disposition;
using Mbb.Archive.Modules.Retention.Application.Holds.Place;
using Mbb.Archive.Modules.Retention.Application.Holds.Release;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.UnitTests;

[TestClass]
public sealed class RetentionCommandTests
{
    [TestMethod] public async Task DifferentEventId_ForSameDeclarationDoesNotDuplicateCase()
    {
        var f = new RetentionFixture(); var item = f.AddEligibleCase();
        var handler = new ScheduleRetentionCaseCommandHandler(f, f, f);
        var command = new ScheduleRetentionCaseCommand(Guid.NewGuid(), "declared", item.ArchiveRecordId, item.DocumentId, item.RuleCode, item.TriggerAt);
        var first = await handler.Handle(command, default);
        var second = await handler.Handle(command with { MessageId = Guid.NewGuid() }, default);
        Assert.AreEqual(item.Id, first.Value); Assert.AreEqual(item.Id, second.Value);
        Assert.AreEqual(1, f.Cases.Count); Assert.AreEqual(2, f.Inbox.Count);
    }
    [TestMethod] public async Task Redelivery_ToleratesPostgresSubmicrosecondTruncation()
    {
        var f = new RetentionFixture(); var item = f.AddEligibleCase();
        var replayAt = new DateTimeOffset(item.TriggerAt.UtcTicks / 10 * 10, TimeSpan.Zero);
        var result = await new ScheduleRetentionCaseCommandHandler(f, f, f).Handle(
            new(Guid.NewGuid(), "declared", item.ArchiveRecordId, item.DocumentId, item.RuleCode, replayAt), default);
        Assert.IsTrue(result.IsSuccess); Assert.AreEqual(1, f.Cases.Count);
    }
    [TestMethod] public async Task ConflictingRedelivery_DoesNotChangeExistingSchedule()
    {
        var f = new RetentionFixture(); var item = f.AddEligibleCase();
        var result = await new ScheduleRetentionCaseCommandHandler(f, f, f).Handle(
            new(Guid.NewGuid(), "declared", item.ArchiveRecordId, item.DocumentId, "OTHER", item.TriggerAt), default);
        Assert.IsTrue(result.IsFailure); Assert.AreEqual(0, f.Inbox.Count);
    }
    [TestMethod] public async Task CreateReplay_IsIdempotentAndRejectsPayloadReuse()
    {
        var f = new RetentionFixture(); var item = f.AddEligibleCase();
        var command = new CreateDispositionCommand(Guid.NewGuid(), item.Id, DispositionAction.Transfer, "Gerekçe", "Komisyon 1");
        var first = await f.Handler.Handle(command, default); var second = await f.Handler.Handle(command, default);
        Assert.AreEqual(first.Value, second.Value); Assert.AreEqual(1, f.Processes.Count); Assert.AreEqual(1, f.Events.Count);
        Assert.IsTrue((await f.Handler.Handle(command with { Reason = "Başka gerekçe" }, default)).IsFailure);
    }
    [TestMethod] public async Task DuplicateOpenProcess_IsRejected()
    {
        var f = new RetentionFixture(); var item = f.AddEligibleCase();
        var command = new CreateDispositionCommand(Guid.NewGuid(), item.Id, DispositionAction.Transfer, "Gerekçe", "Komisyon 1");
        await f.Handler.Handle(command, default);
        Assert.IsTrue((await f.Handler.Handle(command with { RequestId = Guid.NewGuid() }, default)).IsFailure);
    }
    [TestMethod] public async Task StaleVersion_CannotAdvanceOrPublish()
    {
        var f = new RetentionFixture(); var item = f.AddEligibleCase();
        var id = (await f.Handler.Handle(new CreateDispositionCommand(Guid.NewGuid(), item.Id, DispositionAction.Transfer, "Gerekçe", "Komisyon 1"), default)).Value;
        var result = await f.Handler.Handle(new AdvanceDispositionCommand(id, 99, DispositionOperation.Submit), default);
        Assert.IsTrue(result.IsFailure); Assert.AreEqual("retention.stale_version", result.Error.Code); Assert.AreEqual(1, f.Events.Count);
    }
    [TestMethod] public async Task MultipleHolds_ReleaseIsSpecificAndIdempotent()
    {
        var f = new RetentionFixture(); var item = f.AddEligibleCase();
        var place = new PlaceLegalHoldCommandHandler(f, f, f, TimeProvider.System, f);
        var first = (await place.Handle(new(item.Id, "Dava 1", "lawyer"), default)).Value;
        await place.Handle(new(item.Id, "Dava 2", "lawyer"), default);
        var release = new ReleaseLegalHoldCommandHandler(f, f, f, TimeProvider.System, f);
        Assert.IsTrue((await release.Handle(new(item.Id, null, "lawyer", "Kaldır"), default)).IsFailure);
        Assert.IsTrue((await release.Handle(new(item.Id, first, "lawyer", "Dava 1 sonuçlandı"), default)).IsSuccess);
        Assert.IsTrue((await release.Handle(new(item.Id, first, "lawyer", "Dava 1 sonuçlandı"), default)).IsSuccess);
        Assert.AreEqual(1, item.ActiveHoldCount); Assert.AreEqual(1, f.Holds.Count(x => x.IsActive));
    }
    [TestMethod] public async Task Receipt_CannotBeIssuedBeforeCompletion()
    {
        var f = new RetentionFixture(); var item = f.AddEligibleCase();
        var id = (await f.Handler.Handle(new CreateDispositionCommand(Guid.NewGuid(), item.Id, DispositionAction.Transfer, "Gerekçe", "Komisyon 1"), default)).Value;
        var result = await new DispositionReceiptHandler(f, f).Handle(id, default);
        Assert.IsTrue(result.IsFailure); Assert.AreEqual("retention.receipt_not_ready", result.Error.Code);
    }
}
