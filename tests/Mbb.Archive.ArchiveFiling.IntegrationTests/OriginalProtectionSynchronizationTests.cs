using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Contracts;
using Mbb.Archive.Modules.Documents.Domain.Documents;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;
[TestClass]
public sealed class OriginalProtectionSynchronizationTests
{
    [TestMethod]
    public async Task SharedPinnedAndUnpinnedOriginalRetainsEveryDocumentsRequirement()
    {
        var storage=new Storage();await using var f=Fixture(storage);await f.Initialize();
        Add(f.Document,storage,false);Add(f.OtherDocument,storage,true);await f.Get<DocumentsDbContext>().SaveChangesAsync();
        var until=DateTimeOffset.UtcNow.AddYears(4);
        await f.Get<IOriginalProtectionSynchronizer>().SynchronizeAsync([new(f.Document.Id.Value,until,false,false),new(f.OtherDocument.Id.Value,null,true,false)],default);
        var calls=storage.Calls.Where(x=>x.Key==storage.Key).ToArray();Assert.IsTrue(calls.Length>0);Assert.IsTrue(calls.All(x=>x.Hold));
        Assert.IsTrue(calls.All(x=>x.Until>=until));
        foreach(var version in new[]{f.Document.Versions.Single(),f.OtherDocument.Versions.Single()})
        { Assert.AreEqual("storage-v1",version.StorageVersionId);Assert.IsTrue(version.StorageLegalHold);Assert.IsNull(version.ProtectionError); }
    }
    [TestMethod]
    public async Task ExternalHoldIsPreservedButApplicationOwnedHoldCanBeReleased()
    {
        var storage=new Storage { Held=true };await using var f=Fixture(storage);await f.Initialize();Add(f.Document,storage,true);
        await f.Get<DocumentsDbContext>().SaveChangesAsync();var sync=f.Get<IOriginalProtectionSynchronizer>();
        await sync.SynchronizeAsync([new(f.Document.Id.Value,null,false,false)],default);
        var version=f.Document.Versions.Single();Assert.IsTrue(storage.Calls.Last(x=>x.Key==storage.Key).Hold);Assert.IsFalse(version.OwnsStorageLegalHold);
        version.RecordProtection(null,true,true,null,DateTimeOffset.UtcNow);await f.Get<DocumentsDbContext>().SaveChangesAsync();
        await sync.SynchronizeAsync([new(f.Document.Id.Value,null,false,false)],default);
        Assert.IsFalse(storage.Calls.Last(x=>x.Key==storage.Key).Hold);Assert.IsFalse(version.StorageLegalHold);Assert.IsFalse(version.OwnsStorageLegalHold);
    }
    [TestMethod]
    public async Task ProviderFailureIsNotReportedAsNewProtection()
    {
        var storage=new Storage { Fail=true };await using var f=Fixture(storage);await f.Initialize();Add(f.Document,storage,true);
        var version=f.Document.Versions.Single();var previous=DateTimeOffset.UtcNow.AddYears(2);version.RecordProtection(previous,true,true,null,DateTimeOffset.UtcNow);
        await f.Get<DocumentsDbContext>().SaveChangesAsync();
        var result=await f.Get<IOriginalProtectionSynchronizer>().SynchronizeAsync([new(f.Document.Id.Value,previous.AddYears(5),true,false)],default);
        Assert.IsTrue(result.Failed>=1);Assert.IsNotNull(version.ProtectionError);Assert.AreEqual(previous,version.ProtectedUntil);Assert.AreEqual("storage-v1",version.StorageVersionId);
    }
    [TestMethod]
    public async Task SharedLegacyReferenceDoesNotTurnOwnedHoldIntoAnExternalHold()
    {
        var storage=new Storage { Held=true };await using var f=Fixture(storage);await f.Initialize();
        Add(f.Document,storage,false);Add(f.OtherDocument,storage,true);
        f.OtherDocument.Versions.Single().RecordProtection(null,true,true,null,DateTimeOffset.UtcNow);
        await f.Get<DocumentsDbContext>().SaveChangesAsync();
        await f.Get<IOriginalProtectionSynchronizer>().SynchronizeAsync([new(f.Document.Id.Value,null,false,false),new(f.OtherDocument.Id.Value,null,false,false)],default);
        Assert.IsFalse(storage.Held);
        foreach(var version in new[]{f.Document.Versions.Single(),f.OtherDocument.Versions.Single()})
        {Assert.IsFalse(version.StorageLegalHold);Assert.IsFalse(version.OwnsStorageLegalHold);Assert.IsNull(version.ProtectionError);}
    }
    [TestMethod]
    public async Task ProviderCannotRepinAnArchivedVersionToAnotherObjectVersion()
    {
        var storage=new Storage { WrongVersion=true };await using var f=Fixture(storage);await f.Initialize();Add(f.Document,storage,true);
        await f.Get<DocumentsDbContext>().SaveChangesAsync();
        var result=await f.Get<IOriginalProtectionSynchronizer>().SynchronizeAsync([new(f.Document.Id.Value,null,true,false)],default);
        Assert.IsTrue(result.Failed>=1);Assert.AreEqual("storage-v1",f.Document.Versions.Single().StorageVersionId);Assert.IsNotNull(f.Document.Versions.Single().ProtectionError);
    }
    private static FilingFixture Fixture(Storage storage)=>new(){ConfigureServices=services=>services.AddSingleton<IOriginalObjectStorage>(storage)};
    private static void Add(Document document,Storage storage,bool pin)
    { document.AddVersion(storage.Key,storage.Hash,"application/pdf",storage.Bytes.Length,"test",null,DateTimeOffset.UtcNow);if(pin)document.Versions.Single().PinStorageVersion("storage-v1"); }
    private sealed class Storage:IOriginalObjectStorage,IOriginalProtectionStorage
    {
        public readonly byte[] Bytes="original evidence"u8.ToArray();public string Key="tests/"+Guid.NewGuid();public string Hash=>Convert.ToHexStringLower(SHA256.HashData(Bytes));
        public bool Held,Fail,WrongVersion;public DateTimeOffset? Until;public List<(string Key,bool Hold,DateTimeOffset? Until)> Calls=[];
        public Task<OriginalProtectionState> InspectAsync(string key,string? version,CancellationToken ct)
        { if(key!=Key)throw new InvalidOperationException("Unrelated test object");return Task.FromResult(new OriginalProtectionState("storage-v1",Bytes.Length,Hash,Until,Held)); }
        public Task<OriginalProtectionState> ProtectAsync(string key,string version,DateTimeOffset? until,bool held,CancellationToken ct)
        { Calls.Add((key,held,until));if(Fail)throw new InvalidOperationException("Provider unavailable");Held=held;Until=until;return WrongVersion?Task.FromResult(new OriginalProtectionState("wrong-version",Bytes.Length,Hash,Until,Held)):InspectAsync(key,version,ct); }
        public Task<Stream?> OpenReadAsync(string key,CancellationToken ct)=>Task.FromResult<Stream?>(new MemoryStream(Bytes));
        public Task<Stream?> OpenReadVersionAsync(string key,string? version,CancellationToken ct)=>OpenReadAsync(key,ct);
        public Task<StoredOriginalDescriptor> StoreAsync(string hash,string mime,long size,Stream content,CancellationToken ct)=>throw new NotSupportedException();
        public Task<ObjectFixityResult> VerifyAsync(string key,string hash,long size,CancellationToken ct)=>throw new NotSupportedException();
    }
}
