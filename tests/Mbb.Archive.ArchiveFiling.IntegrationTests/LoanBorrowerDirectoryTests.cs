using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Api.Infrastructure;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;
[TestClass]
public sealed class LoanBorrowerDirectoryTests
{
    [TestMethod]
    public async Task UnknownInactiveAndOutsideScopeMembershipsAreRejected()
    {
        var f=new Fixture();var directory=new LoanBorrowerDirectory(f,f);
        Assert.IsTrue(await directory.IsActiveAsync("visible",default));
        Assert.IsFalse(await directory.IsActiveAsync("outside",default));Assert.IsFalse(await directory.IsActiveAsync("inactive",default));
        Assert.IsFalse(await directory.IsActiveAsync("unknown",default));Assert.IsFalse(await directory.IsActiveAsync(" ",default));
        f.Scope=AccessScope.Empty("operator");Assert.IsFalse(await directory.IsActiveAsync("visible",default));
    }
    [TestMethod]
    public async Task SearchReturnsDistinctVisibleActiveMembersWithStablePaging()
    {
        var f=new Fixture();var directory=new LoanBorrowerDirectory(f,f);
        f.Members.AddRange(Enumerable.Range(0,101).Select(i=>f.Member($"staff-{i:D3}",f.Owner,"Birim")));
        f.Members.Add(f.Member("visible",f.Child,"Alt birim"));
        var page=await directory.SearchAsync("staff",PageRequest.Create(5,25).Value,default);
        Assert.AreEqual(101L,page.TotalCount);Assert.AreEqual("staff-100",page.Items.Single().SubjectId);
        var all=await directory.SearchAsync("",PageRequest.Create(1,100).Value,default);
        Assert.AreEqual(102L,all.TotalCount);Assert.AreEqual(1,(await directory.SearchAsync("visible",PageRequest.Create(1,25).Value,default)).Items.Count);
        Assert.IsFalse(all.Items.Any(x=>x.SubjectId is "inactive" or "outside"));
    }
    private sealed class Fixture:IOrganizationQueries,ICurrentUserScope
    {
        public Guid Owner=Guid.NewGuid(),Child=Guid.NewGuid(),Other=Guid.NewGuid(),Inactive=Guid.NewGuid();public AccessScope Scope;
        public List<UnitMembershipSummary> Members=[];
        public Fixture(){Scope=new("operator",false,["/A/"],[Owner],[],[]);Members=[Member("visible",Owner,"Birim"),Member("outside",Other,"Diğer"),Member("inactive",Inactive,"Kapalı")];}
        public UnitMembershipSummary Member(string subject,Guid unit,string name)=>new(Guid.NewGuid(),subject,unit,"CODE",name,true,"local",DateTimeOffset.UtcNow);
        public Task<AccessScope> GetAsync(CancellationToken ct)=>Task.FromResult(Scope);
        public Task<IReadOnlyList<OrganizationUnitSummary>> GetTreeAsync(bool inactive,CancellationToken ct)=>Task.FromResult<IReadOnlyList<OrganizationUnitSummary>>([
            new(Owner,"A","Birim",null,null,"/A/",0,true,null,1),new(Child,"C","Alt birim",null,Owner,"/A/C/",1,true,null,1),
            new(Other,"B","Diğer",null,null,"/B/",0,true,null,1),new(Inactive,"I","Kapalı",null,Owner,"/A/I/",1,false,null,1)]);
        public Task<OrganizationUnitSummary?> GetUnitAsync(Guid id,CancellationToken ct)=>throw new NotSupportedException();
        public Task<IReadOnlyList<UnitMembershipSummary>> GetUnitMembersAsync(Guid id,CancellationToken ct)=>Task.FromResult<IReadOnlyList<UnitMembershipSummary>>(Members.Where(x=>x.UnitId==id).ToArray());
        public Task<IReadOnlyList<UnitMembershipSummary>> GetSubjectMembershipsAsync(string subject,CancellationToken ct)=>Task.FromResult<IReadOnlyList<UnitMembershipSummary>>(Members.Where(x=>x.SubjectId==subject).ToArray());
    }
}
