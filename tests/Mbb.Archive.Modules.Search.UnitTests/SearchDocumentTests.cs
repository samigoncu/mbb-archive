using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.Search.Domain.Documents;
namespace Mbb.Archive.Modules.Search.UnitTests;
[TestClass] public sealed class SearchDocumentTests
{
    private static readonly DateTimeOffset Now=new(2026,9,2,12,0,0,TimeSpan.Zero);
    [TestMethod] public void MetadataSchemaReplacement_DoesNotDuplicateSchema(){var d=SearchDocument.Create(Guid.CreateVersion7(),"Belge",Now);d.ReplaceMetadataSchema("imar","İmar",1,"{\"ada\":\"1\"}",Now.AddSeconds(1));d.ReplaceMetadataSchema("imar","İmar",1,"{\"ada\":\"2\"}",Now.AddSeconds(2));Assert.IsTrue(d.MetadataJson.Contains("\"2\""));}
    [TestMethod] public void ProcessingUpdate_IncrementsRevision(){var d=SearchDocument.Create(Guid.CreateVersion7(),"Belge",Now);var before=d.Revision;d.ApplyProcessing(Guid.CreateVersion7(),"application/pdf","a.txt","a.json",Now.AddSeconds(1));Assert.AreEqual(before+1,d.Revision);}
}
