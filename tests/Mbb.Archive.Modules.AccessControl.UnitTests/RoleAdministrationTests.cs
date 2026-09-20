using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.AccessControl.Domain.Roles;
using Mbb.Archive.Modules.AccessControl.Application.Roles;
namespace Mbb.Archive.Modules.AccessControl.UnitTests;
[TestClass]
public sealed class RoleAdministrationTests
{
    [TestMethod]
    public void ReplacingPermissionsRevokesRemovedAndPreservesRetainedIdentity()
    {
        var role = Role.Create("reader", "Reader");
        role.Grant("documents.read"); role.Grant("documents.write");
        var original = role.Permissions.Single(p => p.Permission == "documents.read").Id;
        role.ReplacePermissions(["documents.read", "search.read", "SEARCH.READ"]);
        CollectionAssert.AreEquivalent(new[] { "documents.read", "search.read" }, role.Permissions.Select(p => p.Permission).ToArray());
        Assert.AreEqual(original, role.Permissions.Single(p => p.Permission == "documents.read").Id);
    }
    [TestMethod]
    public void EmptySelectionRevokesAllRolePermissions()
    {
        var role = Role.Create("reader", "Reader"); role.Grant("documents.read"); role.ReplacePermissions([]);
        Assert.AreEqual(0, role.Permissions.Count);
    }
    [TestMethod]
    public void VersionIgnoresOrderButChangesWhenAssignmentsChange()
    {
        Assert.AreEqual(AccessVersion.Of(["a", "b"]), AccessVersion.Of(["b", "a"]));
        Assert.AreNotEqual(AccessVersion.Of(["a", "b"]), AccessVersion.Of(["a"]));
    }
    [TestMethod]
    public void CatalogSeparatesGlobalScopeFromOperationPermission()
    {
        Assert.IsTrue(PermissionCatalog.Codes.Contains("documents.read"));
        Assert.IsTrue(PermissionCatalog.Codes.Contains("documents.read.all"));
        Assert.IsTrue(PermissionCatalog.Codes.Contains("physical-archive.manage.all"));
        Assert.IsFalse(PermissionCatalog.Codes.Contains("*"));
    }
}
