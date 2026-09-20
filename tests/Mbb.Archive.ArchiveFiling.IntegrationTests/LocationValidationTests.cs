using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.Modules.PhysicalArchive.Application.Commands;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Locations;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;
[TestClass]
public sealed class LocationValidationTests
{
    [TestMethod]
    public async Task MissingRootFieldsAreRejectedBeforeRepositoryAccess()
    {
        var handler = new PhysicalArchiveCommandHandlers(null!, null!, null!, TimeProvider.System, null!);
        var result = await handler.Handle(new CreateRootLocationCommand(null!, null!, null!), default);
        Assert.IsTrue(result.IsFailure);
    }
    [TestMethod]
    public async Task MissingChildFieldsAreRejectedBeforeRepositoryAccess()
    {
        var handler = new PhysicalArchiveCommandHandlers(null!, null!, null!, TimeProvider.System, null!);
        var result = await handler.Handle(new CreateChildLocationCommand(Guid.NewGuid(), null!, null!, null!, null!, null), default);
        Assert.IsTrue(result.IsFailure);
    }
}
