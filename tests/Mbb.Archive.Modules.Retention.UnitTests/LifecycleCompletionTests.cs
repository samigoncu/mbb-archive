using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Retention.Application.Disposition;
using Mbb.Archive.Modules.Retention.Application.Holds.Place;
using Mbb.Archive.Modules.Retention.Contracts;
using Mbb.Archive.Modules.Retention.Domain.Cases;
using Mbb.Archive.Modules.Retention.Domain.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.UnitTests;

[TestClass]
public sealed class LifecycleCompletionTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow.AddMinutes(-1);

    private static (RetentionFixture Fixture, RetentionCase Case, DispositionProcess Process) Approved(DispositionAction action = DispositionAction.Transfer)
    {
        var fixture = new RetentionFixture();
        var rule = RetentionRule.Create("LIFECYCLE", "Saklama", 1, action, Now.AddYears(-1));
        var item = RetentionCase.Schedule(Guid.NewGuid(), Guid.NewGuid(), rule, Now.AddMonths(-2));
        fixture.Rules.Add(rule); fixture.Cases.Add(item);
        var process = DispositionProcess.Create(Guid.NewGuid(), item, action, "Gerekçe", "Komisyon 26", "preparer", 2, Now);
        process.ConfigureCommission("manager", ["reviewer1", "reviewer2"], Now.AddDays(-1), Now.AddDays(1));
        process.Submit("preparer", item, Now);
        process.Review("reviewer1", true, "Uygun", item, Now);
        process.Review("reviewer2", true, "Uygun", item, Now);
        process.Approve("approver", "Onay 26", item, Now);
        fixture.Processes.Add(process);
        return (fixture, item, process);
    }

    private static Guid AddSource(RetentionFixture fixture, Guid documentId, string content)
    {
        var version = Guid.NewGuid(); var bytes = Encoding.UTF8.GetBytes(content);
        fixture.Originals[version] = bytes;
        fixture.Sources[documentId] = new(documentId, "Belge", "{\"birim\":\"Arşiv\"}", [new(version, 1, "text/plain", bytes.Length, Convert.ToHexStringLower(SHA256.HashData(bytes)))]);
        return version;
    }

    [TestMethod]
    public async Task PhysicalExecution_PreservesDigitalBytesAndVersionsAndProducesTruthfulReceipt()
    {
        var (fixture, item, process) = Approved(DispositionAction.Destroy);
        var originalVersion = AddSource(fixture, process.DocumentId, "Dijital asıl korunur");
        var evidenceDocument = Guid.NewGuid(); var evidenceVersion = AddSource(fixture, evidenceDocument, "İmzalı fiziksel imha tutanağı");
        var originalBytes = fixture.Originals[originalVersion].ToArray();
        fixture.Subject = "executor";
        var result = await fixture.Handler.Handle(new AdvanceDispositionCommand(process.Id, process.ConcurrencyVersion, DispositionOperation.ExecuteDestruction,
            Reference: "Tutanak-26", EvidenceDocumentId: evidenceDocument, EvidenceVersionId: evidenceVersion,
            Method: "Parçalama", Location: "Depo", Witnesses: "Tanık A, Tanık B", ExecutedAt: Now.AddSeconds(1)), default);
        Assert.IsTrue(result.IsSuccess, result.IsFailure ? result.Error.Description : "");
        CollectionAssert.AreEqual(originalBytes, fixture.Originals[originalVersion]);
        Assert.IsTrue(item.DigitalPreservationRequired); Assert.AreEqual(DispositionAction.KeepPermanent, item.Action);
        Assert.IsNull(item.DueAt); Assert.AreEqual(1, fixture.PhysicalRecords);
        item.PlaceHold(); Assert.AreEqual(1, item.ActiveHoldCount);
        using var receipt = JsonDocument.Parse((await new DispositionReceiptHandler(fixture, fixture).Handle(process.Id, default)).Value);
        Assert.IsFalse(receipt.RootElement.GetProperty("originalFilesDeleted").GetBoolean());
        Assert.IsFalse(receipt.RootElement.GetProperty("destructionExecuted").GetBoolean());
        Assert.IsTrue(receipt.RootElement.GetProperty("physicalDestructionRecorded").GetBoolean());
        Assert.IsTrue(receipt.RootElement.GetProperty("digitalOriginalsPreserved").GetBoolean());
    }

    [TestMethod]
    public async Task PhysicalExecution_RejectsMissingHiddenAndCorruptEvidence()
    {
        var (fixture, _, process) = Approved(DispositionAction.Destroy); fixture.Subject = "executor";
        AddSource(fixture, process.DocumentId, "Korunacak dijital asıl");
        var missing = await fixture.Handler.Handle(new AdvanceDispositionCommand(process.Id, process.ConcurrencyVersion, DispositionOperation.ExecuteDestruction, Reference: "T26"), default);
        Assert.IsTrue(missing.IsFailure); Assert.AreEqual(DispositionProcessStatus.Approved, process.Status);
        var evidence = Guid.NewGuid(); var version = AddSource(fixture, evidence, "Tutanak"); fixture.Hidden.Add(evidence);
        var command = new AdvanceDispositionCommand(process.Id, process.ConcurrencyVersion, DispositionOperation.ExecuteDestruction,
            Reference: "T26", EvidenceDocumentId: evidence, EvidenceVersionId: version, Method: "Parçalama", Location: "Depo", Witnesses: "A ve B", ExecutedAt: Now);
        Assert.IsTrue((await fixture.Handler.Handle(command, default)).IsFailure);
        fixture.Hidden.Clear(); fixture.Originals[version] = Encoding.UTF8.GetBytes("BOZUK!!");
        Assert.IsTrue((await fixture.Handler.Handle(command, default)).IsFailure);
        Assert.AreEqual(0, fixture.PhysicalRecords); Assert.AreEqual(0, fixture.Saves);
    }

    [TestMethod]
    public async Task PhysicalExecution_RequiresEveryDigitalVersionToExistAndMatchHash()
    {
        var (fixture, _, process) = Approved(DispositionAction.Destroy); fixture.Subject = "executor";
        var original = AddSource(fixture, process.DocumentId, "Dijital asıl");
        var evidenceId = Guid.NewGuid(); var evidenceVersion = AddSource(fixture, evidenceId, "Tutanak");
        var command = new AdvanceDispositionCommand(process.Id, process.ConcurrencyVersion, DispositionOperation.ExecuteDestruction,
            Reference: "T26", EvidenceDocumentId: evidenceId, EvidenceVersionId: evidenceVersion,
            Method: "Parçalama", Location: "Depo", Witnesses: "A ve B", ExecutedAt: Now);
        var bytes = fixture.Originals[original]; fixture.Originals.Remove(original);
        var missing = await fixture.Handler.Handle(command, default);
        Assert.AreEqual("retention.digital_original_missing", missing.Error.Code);
        fixture.Originals[original] = bytes; bytes[0] ^= 1;
        var corrupt = await fixture.Handler.Handle(command, default);
        Assert.AreEqual("retention.digital_original_corrupted", corrupt.Error.Code);
        Assert.AreEqual(0, fixture.PhysicalRecords); Assert.AreEqual(DispositionProcessStatus.Approved, process.Status);
    }

    [TestMethod]
    public async Task OutOfScopeProcess_BlocksReadReceiptAdvanceAndHold()
    {
        var (fixture, item, process) = Approved(); fixture.Hidden.Add(process.DocumentId);
        Assert.IsTrue((await new DispositionQueryHandler(fixture, fixture).Get(process.Id, default)).IsFailure);
        Assert.IsTrue((await new DispositionReceiptHandler(fixture, fixture).Handle(process.Id, default)).IsFailure);
        Assert.IsTrue((await fixture.Handler.Handle(new AdvanceDispositionCommand(process.Id, process.ConcurrencyVersion, DispositionOperation.AcceptTransfer), default)).IsFailure);
        Assert.IsTrue((await new PlaceLegalHoldCommandHandler(fixture, fixture, fixture, TimeProvider.System, fixture).Handle(new(item.Id, "Dava", "lawyer"), default)).IsFailure);
        Assert.AreEqual(0, fixture.Saves); Assert.AreEqual(0, item.ActiveHoldCount);
    }

    [TestMethod]
    public async Task Transfer_PackageIncludesVerifiedOriginalAndRequiresSameReceiverVerification()
    {
        var (fixture, item, process) = Approved(); var version = AddSource(fixture, process.DocumentId, "Belge aslı");
        var store = new MemoryPackages(); var handler = PackageHandler(fixture, store);
        var package = await handler.Create(process.Id, process.ConcurrencyVersion, default);
        Assert.IsTrue(package.IsSuccess, package.IsFailure ? package.Error.Description : "");
        using (var zip = new System.IO.Compression.ZipArchive(new MemoryStream(store.Bytes[package.Value])))
        {
            Assert.IsNotNull(zip.GetEntry("manifest.json"));
            var file = zip.GetEntry($"originals/{version:D}.bin"); Assert.IsNotNull(file);
            using var text = new StreamReader(file.Open()); Assert.AreEqual("Belge aslı", await text.ReadToEndAsync());
        }
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.AcceptTransfer("receiver", "Arşiv", "T26", item, Now));
        fixture.Subject = "receiver";
        var result = await handler.Verify(process.Id, package.Value, process.ConcurrencyVersion, new MemoryStream(store.Bytes[package.Value]), default);
        Assert.IsTrue(result.IsSuccess);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.AcceptTransfer("someone-else", "Arşiv", "T26", item, Now));
        process.AcceptTransfer("receiver", "Arşiv", "T26", item, DateTimeOffset.UtcNow);
        Assert.AreEqual(DispositionProcessStatus.Completed, process.Status);
    }

    [TestMethod]
    public async Task Transfer_TamperingCannotValidateOrComplete()
    {
        var (fixture, _, process) = Approved(); AddSource(fixture, process.DocumentId, "Kaynak");
        var store = new MemoryPackages(); var handler = PackageHandler(fixture, store);
        var id = (await handler.Create(process.Id, process.ConcurrencyVersion, default)).Value;
        var tampered = store.Bytes[id].ToArray(); tampered[^1] ^= 1; fixture.Subject = "receiver";
        var result = await handler.Verify(process.Id, id, process.ConcurrencyVersion, new MemoryStream(tampered), default);
        Assert.IsTrue(result.IsFailure); Assert.AreEqual("retention.package_hash_mismatch", result.Error.Code);
        Assert.IsNull(process.PackageVerifiedAt); Assert.AreEqual(DispositionProcessStatus.Approved, process.Status);
    }

    [TestMethod]
    public async Task Transfer_CorruptSourceAndLateHoldRejectPackage()
    {
        var (fixture, item, process) = Approved(); var version = AddSource(fixture, process.DocumentId, "Kaynak");
        fixture.Originals[version][0] ^= 1;
        var store = new MemoryPackages(); var handler = PackageHandler(fixture, store);
        Assert.IsTrue((await handler.Create(process.Id, process.ConcurrencyVersion, default)).IsFailure);
        Assert.IsNull(process.TransferPackageId); Assert.AreEqual(0, store.Bytes.Count);
        fixture.Originals[version][0] ^= 1; item.PlaceHold();
        Assert.IsTrue((await handler.Create(process.Id, process.ConcurrencyVersion, default)).IsFailure);
        Assert.AreEqual(0, store.Bytes.Count);
    }

    [TestMethod]
    public void Commission_ExplicitMembershipValidityAndDelegationAreEnforced()
    {
        var fixture = new RetentionFixture(); var item = fixture.AddEligibleCase();
        var process = DispositionProcess.Create(Guid.NewGuid(), item, DispositionAction.Transfer, "Gerekçe", "Komisyon", "preparer", 2, Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Submit("preparer", item, Now));
        process.ConfigureCommission("manager", ["member1", "member2"], Now.AddDays(-1), Now.AddDays(1));
        process.DelegateMember("member1", "delegate", "Vekâlet-26", Now.AddHours(-1), Now.AddHours(1));
        process.Submit("preparer", item, Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Review("outsider", true, "Uygun", item, Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Review("member1", true, "Uygun", item, Now));
        process.Review("delegate", true, "Uygun", item, Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.DelegateMember("member1", "delegate2", "V2", Now, Now.AddHours(2)));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Review("member1", true, "Uygun", item, Now.AddHours(2)));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => process.Review("member2", true, "Uygun", item, Now.AddDays(2)));
    }

    private static TransferPackageHandler PackageHandler(RetentionFixture fixture, MemoryPackages store)
        => new(fixture, fixture, fixture, store, fixture, fixture, fixture, fixture, TimeProvider.System);

    private sealed class MemoryPackages : ITransferPackageStore
    {
        public Dictionary<Guid, byte[]> Bytes { get; } = [];
        public async Task<TransferPackageArtifact> CreateAsync(Guid id, Func<Stream, CancellationToken, Task> writer, CancellationToken ct)
        {
            using var stream = new MemoryStream(); await writer(stream, ct); var bytes = stream.ToArray(); Bytes[id] = bytes;
            return new(bytes.Length, Convert.ToHexStringLower(SHA256.HashData(bytes)));
        }
        public Task<Stream?> OpenAsync(Guid id, CancellationToken ct) => Task.FromResult<Stream?>(Bytes.TryGetValue(id, out var bytes) ? new MemoryStream(bytes) : null);
        public Task DeleteUncommittedAsync(Guid id, CancellationToken ct) { Bytes.Remove(id); return Task.CompletedTask; }
    }
}
