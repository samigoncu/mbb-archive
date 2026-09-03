using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
namespace Mbb.Archive.Modules.Classification.UnitTests;
[TestClass] public sealed class FilePlanTests
{
 [TestMethod] public void DuplicateCode_IsRejected(){var plan=FilePlan.Create("SSDP","Saklama Süreli Standart Dosya Planı","V4","Devlet Arşivleri",new DateOnly(2024,1,2),null);plan.AddItem(null,"000","Genel",1,false);Assert.ThrowsExactly<DomainRuleViolationException>(()=>plan.AddItem(null,"000","Tekrar",1,false));}
}
