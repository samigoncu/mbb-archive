using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Domain.Metadata;
namespace Mbb.Archive.Modules.Classification.UnitTests;
[TestClass] public sealed class MetadataSchemaTests
{
 private static readonly DateTimeOffset Now=new(2026,9,2,9,0,0,TimeSpan.Zero);
 [TestMethod] public void PublishedSchema_IsImmutable(){var schema=MetadataSchema.Create("imar-ruhsat","İmar Ruhsat",1,Now);schema.AddField("ada","Ada",MetadataFieldType.Text,true,true,false,null);schema.Publish(Now);Assert.ThrowsExactly<DomainRuleViolationException>(()=>schema.AddField("parsel","Parsel",MetadataFieldType.Text,true,true,false,null));}
 [TestMethod] public void EmptySchema_CannotBePublished(){var schema=MetadataSchema.Create("x","X",1,Now);Assert.ThrowsExactly<DomainRuleViolationException>(()=>schema.Publish(Now));}
}
