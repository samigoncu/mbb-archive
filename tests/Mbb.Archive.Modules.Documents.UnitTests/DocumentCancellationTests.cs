using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Documents.Domain.Documents;
namespace Mbb.Archive.Modules.Documents.UnitTests;
[TestClass]
public sealed class DocumentCancellationTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static Document Create()
    {
        var doc = Document.Create("Yanlış belge", Now);
        doc.AddVersion("original", new string('a',64),"application/pdf",100,"test",null,Now);
        return doc;
    }
    [TestMethod] public void CancelSingleVersionAndRestore_PreservesFileAndVersionIdentity()
    {
        var doc = Create(); var version = doc.Versions.Single(); var revision = doc.ConcurrencyVersion;
        var id = Guid.NewGuid();
        Assert.IsTrue(doc.SetCancellation(true,revision,id,"test","Yanlış dosya",Now));
        Assert.IsFalse(doc.SetCancellation(true,revision,id,"test","Yanlış dosya",Now));
        Assert.AreEqual(DocumentStatus.Cancelled,doc.Status);
        Assert.AreEqual(revision+1,doc.ConcurrencyVersion);
        Assert.AreSame(version,doc.Versions.Single());
        Assert.ThrowsExactly<DomainRuleViolationException>(()=>doc.Archive(Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(()=>doc.ChangeTitle("Başka"));
        var restore = Guid.NewGuid(); revision = doc.ConcurrencyVersion;
        Assert.IsTrue(doc.SetCancellation(false,revision,restore,"test","Kontrol edildi",Now));
        Assert.IsFalse(doc.SetCancellation(false,revision,restore,"test","Kontrol edildi",Now));
        Assert.AreEqual(DocumentStatus.Draft,doc.Status);
        Assert.AreEqual(version.Id,doc.Versions.Single().Id);
        Assert.AreEqual("Yanlış dosya",doc.CancellationReason);
    }
    [TestMethod] public void StaleArchivedAndReusedIdentityCannotChangeState()
    {
        var doc=Create();
        Assert.ThrowsExactly<DomainRuleViolationException>(()=>doc.SetCancellation(true,1,Guid.NewGuid(),"test","Yanlış",Now));
        doc.Archive(Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(()=>doc.SetCancellation(true,doc.ConcurrencyVersion,Guid.NewGuid(),"test","Yanlış",Now));
        doc=Create();var id=Guid.NewGuid();doc.SetCancellation(true,doc.ConcurrencyVersion,id,"test","Yanlış",Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(()=>doc.SetCancellation(false,doc.ConcurrencyVersion,id,"test","Geri al",Now));
        Assert.ThrowsExactly<DomainRuleViolationException>(()=>doc.SetCancellation(false,doc.ConcurrencyVersion,Guid.NewGuid(),"test"," ",Now));
    }
    [TestMethod] public void InFlightUploadMayFinishWithoutReactivatingCancelledDocument()
    {
        var doc=Document.Create("Yükleniyor",Now);
        doc.BeginFileIngestion("file.pdf","application/pdf",100,"test",null,Now);
        doc.SetCancellation(true,doc.ConcurrencyVersion,Guid.NewGuid(),"test","Yanlış yükleme",Now);
        doc.CompletePendingFileIngestion("original",new string('a',64),"application/pdf",100,"test",null,Now);
        Assert.AreEqual(DocumentStatus.Cancelled,doc.Status);
        Assert.AreEqual(1,doc.Versions.Count);
        Assert.ThrowsExactly<DomainRuleViolationException>(()=>doc.BeginFileIngestion("new.pdf","application/pdf",100,"test",null,Now));
    }
}
