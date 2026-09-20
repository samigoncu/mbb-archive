using Microsoft.VisualStudio.TestTools.UnitTesting;
using Microsoft.Extensions.Logging.Abstractions;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Organization.Application;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
using Mbb.Archive.Modules.Organization.Domain.Units;
using Mbb.Archive.Modules.Organization.Application.Directory;
using Mbb.Archive.Modules.Organization.Domain.Directory;
using Mbb.Archive.Modules.Organization.Infrastructure.Directory;
namespace Mbb.Archive.Modules.Organization.UnitTests;
[TestClass]
public sealed class DirectorySyncTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-09-17T10:00:00Z");
    [TestMethod] public async Task ChangedDepartmentRemovesOnlyStaleDirectoryGrantsAndPreservesManualPrimary()
    {
        var f = new Fixture(); var result = await f.Service.SyncUserAsync("oidc-sub", default, "directory-login");
        Assert.IsTrue(result.IsSuccess); Assert.AreEqual(1, result.Value.MembershipsRemoved);
        Assert.AreEqual(1, result.Value.MembershipsAssigned); Assert.AreEqual("directory-login", f.Directory.LastLookup);
        Assert.AreEqual(2, f.Repository.Members.Count);
        Assert.IsTrue(f.Manual.IsPrimary); Assert.IsTrue(f.Repository.Members.Contains(f.Manual));
        Assert.IsTrue(f.Repository.Members.Any(x => x.SubjectId == "oidc-sub" && x.UnitId == f.New.Id && x.Source == MembershipSource.Directory && !x.IsPrimary));
        var again = await f.Service.SyncUserAsync("oidc-sub", default, "directory-login");
        Assert.AreEqual(0, again.Value.MembershipsAssigned); Assert.AreEqual(0, again.Value.MembershipsRemoved);
    }
    [TestMethod] public async Task ProviderFailureDoesNotRevokeAnyMembership()
    {
        var f = new Fixture(); f.Directory.LookupResult = Result<DirectoryUser>.Failure(Error.Failure("directory.unreachable", "Unavailable"));
        var result = await f.Service.SyncUserAsync("oidc-sub", default);
        Assert.IsTrue(result.IsFailure); Assert.AreEqual(2, f.Repository.Members.Count); Assert.AreEqual(0, f.Repository.Saves);
    }
    [TestMethod] public async Task UnknownDepartmentDoesNotApplyPartialRevocation()
    {
        var f = new Fixture(); f.Directory.LookupResult = Result<DirectoryUser>.Success(new("directory-login", "Name", "UNKNOWN", []));
        var result = await f.Service.SyncUserAsync("oidc-sub", default);
        Assert.IsTrue(result.IsFailure); Assert.AreEqual("directory.unit_not_mapped", result.Error.Code);
        Assert.AreEqual(2, f.Repository.Members.Count);
    }
    [TestMethod] public async Task DisabledDirectoryUserLosesDirectoryGrantsButKeepsManualGrants()
    {
        var f = new Fixture(); f.Directory.LookupResult = Result<DirectoryUser>.Success(new("directory-login", "Name", "NEW", [], false));
        var result = await f.Service.SyncUserAsync("oidc-sub", default);
        Assert.IsTrue(result.IsSuccess); Assert.AreEqual(1, result.Value.MembershipsRemoved);
        Assert.AreEqual(1, f.Repository.Members.Count); Assert.AreSame(f.Manual, f.Repository.Members[0]);
        Assert.IsTrue(result.Value.Warnings.Count > 0);
    }
    [TestMethod] public async Task UnconfiguredDirectoryIsAnExplicitFailure()
    {
        var f = new Fixture(); f.Directory.IsConfigured = false;
        var result = await f.Service.SyncUserAsync("oidc-sub", default);
        Assert.IsTrue(result.IsFailure); Assert.AreEqual("directory.not_configured", result.Error.Code);
        Assert.AreEqual(0, f.Repository.Saves);
    }
    private sealed class Fixture
    {
        public FakeRepository Repository { get; } = new(); public FakeDirectory Directory { get; } = new();
        public FakeDirectoryUsers Users { get; } = new();
        public OrganizationUnit New { get; } = OrganizationUnit.CreateRoot("NEW", "New", null, null, Now);
        public UnitMembership Manual { get; }
        public DirectorySyncService Service { get; }
        public Fixture()
        {
            Repository.Units.Add(New);
            Manual = UnitMembership.Create("oidc-sub", OrganizationUnitId.New(), true, MembershipSource.Manual, Now);
            Repository.Members.Add(Manual); Repository.Members.Add(UnitMembership.Create("oidc-sub", OrganizationUnitId.New(), false, MembershipSource.Directory, Now));
            Service = new(Directory, new DirectoryUserProvisioning(Users, TimeProvider.System),
                Repository, Repository, TimeProvider.System, NullLogger<DirectorySyncService>.Instance);
        }
    }
    private sealed class FakeDirectoryUsers : IDirectoryUserStore
    {
        public List<DirectoryUserRecord> Records { get; } = [];
        public Task<DirectoryUserRecord?> GetAsync(string subjectId, CancellationToken ct)
            => Task.FromResult(Records.FirstOrDefault(x => x.SubjectId == subjectId));
        public Task<IReadOnlyList<DirectoryUserRecord>> SearchAsync(string? search, int limit, CancellationToken ct)
            => Task.FromResult<IReadOnlyList<DirectoryUserRecord>>(Records.Take(limit + 1).ToList());
        public Task AddAsync(DirectoryUserRecord record, CancellationToken ct) { Records.Add(record); return Task.CompletedTask; }
    }

    private sealed class FakeDirectory : IDirectoryClient
    {
        public bool IsConfigured { get; set; } = true;
        public string? LastLookup { get; private set; }
        public Result<DirectoryUser> LookupResult { get; set; } = Result<DirectoryUser>.Success(new("directory-login", "Name", "NEW", []));
        public Task<Result<DirectoryUser>> FindUserAsync(string subjectId, CancellationToken ct) { LastLookup = subjectId; return Task.FromResult(LookupResult); }
        public Task<Result<IReadOnlyList<DirectoryUnit>>> ListUnitsAsync(CancellationToken ct) => Task.FromResult(Result<IReadOnlyList<DirectoryUnit>>.Success([]));
    }
    private sealed class FakeRepository : IOrganizationRepository, IUnitOfWork<OrganizationBoundary>
    {
        public List<UnitMembership> Members { get; } = []; public List<OrganizationUnit> Units { get; } = []; public int Saves { get; private set; }
        public Task AddUnitAsync(OrganizationUnit unit, CancellationToken ct) { Units.Add(unit); return Task.CompletedTask; }
        public Task<OrganizationUnit?> GetUnitAsync(OrganizationUnitId id, CancellationToken ct) => Task.FromResult(Units.SingleOrDefault(x => x.Id == id));
        public Task<OrganizationUnit?> FindUnitByCodeAsync(string code, CancellationToken ct) => Task.FromResult(Units.SingleOrDefault(x => x.Code == code));
        public Task<IReadOnlyList<OrganizationUnit>> GetDescendantsAsync(string prefix, CancellationToken ct) => Task.FromResult<IReadOnlyList<OrganizationUnit>>([]);
        public Task AddMembershipAsync(UnitMembership member, CancellationToken ct) { Members.Add(member); return Task.CompletedTask; }
        public Task<IReadOnlyList<UnitMembership>> GetMembershipsAsync(string subject, CancellationToken ct) => Task.FromResult<IReadOnlyList<UnitMembership>>(Members.Where(x => x.SubjectId == subject).ToArray());
        public void RemoveMembership(UnitMembership membership) => Members.Remove(membership);
        public Task<int> SaveChangesAsync(CancellationToken ct = default) { Saves++; return Task.FromResult(1); }
    }
}
