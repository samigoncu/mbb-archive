using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
namespace Mbb.Archive.Modules.Classification.UnitTests;
[TestClass] public sealed class FilePlanTests
{
 [TestMethod] public void DuplicateCode_IsRejected(){var plan=FilePlan.Create("SSDP","Saklama Süreli Standart Dosya Planı","V4","Devlet Arşivleri",new DateOnly(2024,1,2),null);plan.AddItem(null,"000","Genel",1,false);Assert.ThrowsExactly<DomainRuleViolationException>(()=>plan.AddItem(null,"000","Tekrar",1,false));}
 [TestMethod] public void Retire_PreservesHistoryAndRejectsNewItems()
 {
  var plan = FilePlan.Create("DAB-2019", "Eski plan", "2019.1", "DAB", new DateOnly(2019,1,1), null);
  var item = plan.AddItem(null, "934.01", "İhale Dosyaları", 1, true);
  plan.Retire();
  plan.Retire();
  Assert.IsFalse(plan.IsActive);
  Assert.AreEqual(item.Id, plan.Items.Single().Id);
  Assert.AreEqual("İhale Dosyaları", plan.Items.Single().Title);
  Assert.ThrowsExactly<DomainRuleViolationException>(() => plan.AddItem(null, "702", "Yazılım", 1, true));
 }
}
