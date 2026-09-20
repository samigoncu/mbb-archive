using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.PhysicalArchive.Application.Commands;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Folders;
using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;
[TestClass]
public sealed class LoanLifecycleTests
{
    [TestMethod]
    public async Task UnknownBorrowerLeavesFolderLoansAndOutboxUnchanged()
    {
        await using var f = new FilingFixture(); await f.Initialize(withClassification: true);
        var db = f.Get<PhysicalArchiveDbContext>();
        var before = await db.Database.SqlQueryRaw<int>("SELECT count(*)::integer AS \"Value\" FROM physical_archive.outbox_messages").SingleAsync();
        var result = await f.Get<PhysicalArchiveCommandHandlers>().Handle(new CheckoutPhysicalFolderCommand(f.Folder.Id, "unknown-person", "İnceleme", DateTimeOffset.UtcNow.AddDays(1)), default);
        Assert.IsTrue(result.IsFailure);Assert.AreEqual(PhysicalFolderStatus.Available, f.Folder.Status);
        Assert.AreEqual(0, await db.Set<PhysicalLoan>().CountAsync(x => x.FolderId == f.Folder.Id));
        Assert.AreEqual(before, await db.Database.SqlQueryRaw<int>("SELECT count(*)::integer AS \"Value\" FROM physical_archive.outbox_messages").SingleAsync());
    }
    [TestMethod]
    public async Task Checkout_Return_AndRepeatedOldReturnPreserveNewLoan()
    {
        await using var f = new FilingFixture(); await f.Initialize(withClassification: true);
        var handler = f.Get<PhysicalArchiveCommandHandlers>();
        var first = await handler.Handle(new CheckoutPhysicalFolderCommand(f.Folder.Id, "borrower", "Denetim", DateTimeOffset.UtcNow.AddDays(2)), default);
        Assert.IsTrue(first.IsSuccess); Assert.AreEqual(PhysicalFolderStatus.OnLoan, f.Folder.Status);
        var duplicate = await handler.Handle(new CheckoutPhysicalFolderCommand(f.Folder.Id, "other", "Denetim", DateTimeOffset.UtcNow.AddDays(2)), default);
        Assert.IsTrue(duplicate.IsFailure);
        Assert.IsTrue((await handler.Handle(new ReturnPhysicalFolderCommand(first.Value), default)).IsSuccess);
        Assert.AreEqual(PhysicalFolderStatus.Available, f.Folder.Status);
        var next = await handler.Handle(new CheckoutPhysicalFolderCommand(f.Folder.Id, "next", "Yeni inceleme", DateTimeOffset.UtcNow.AddDays(3)), default);
        Assert.IsTrue(next.IsSuccess);
        Assert.IsTrue((await handler.Handle(new ReturnPhysicalFolderCommand(first.Value), default)).IsSuccess);
        Assert.AreEqual(PhysicalFolderStatus.OnLoan, f.Folder.Status, "Eski iade isteği yeni zimmeti kapatmamalı.");
        Assert.IsTrue((await handler.Handle(new ReturnPhysicalFolderCommand(next.Value), default)).IsSuccess);
    }
}
