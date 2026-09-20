using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Domain.Jobs;
using Mbb.Archive.Modules.Processing.Infrastructure;
using Mbb.Archive.Modules.Processing.Infrastructure.Persistence;
using Npgsql;
namespace Mbb.Archive.ArchiveFiling.IntegrationTests;
[TestClass, DoNotParallelize]
public class ProcessingMonitorTests
{
    private sealed class Visibility(Guid documentId) : IDocumentVisibility
    {
        public bool Fail {get;set;}
        public Task<IReadOnlySet<Guid>> FilterAsync(IReadOnlyCollection<Guid> ids,CancellationToken ct)
        {
            if(Fail)throw new InvalidOperationException("scope unavailable");
            return Task.FromResult<IReadOnlySet<Guid>>(ids.Where(id=>id==documentId).ToHashSet());
        }
    }
    [TestMethod] public async Task CountsPaginationAndDirectAccess_RespectDocumentVisibility()
    {
        var connection=Environment.GetEnvironmentVariable("MBB_ARCHIVE_TEST_POSTGRES");
        if(string.IsNullOrEmpty(connection))Assert.Inconclusive("Isolated test database required.");
        Assert.IsTrue(new NpgsqlConnectionStringBuilder(connection).Database!.Contains("tests"));
        var own=Guid.NewGuid();var other=Guid.NewGuid();var visibility=new Visibility(own);
        var services=new ServiceCollection();services.AddLogging();services.AddSingleton<IDocumentVisibility>(visibility);
        services.AddProcessingModule(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"ConnectionStrings:Processing",connection}}).Build());
        await using var provider=services.BuildServiceProvider();using var scope=provider.CreateScope();
        var db=scope.ServiceProvider.GetRequiredService<ProcessingDbContext>();await db.Database.MigrateAsync();
        var jobs=new[]{ProcessingJob.Create(own,Guid.NewGuid(),"test",new string('a',64),"application/pdf",DateTimeOffset.UtcNow),ProcessingJob.Create(other,Guid.NewGuid(),"test",new string('b',64),"application/pdf",DateTimeOffset.UtcNow)};
        jobs[1].MarkFailed("ocr.failed","private failure");db.Set<ProcessingJob>().AddRange(jobs);await db.SaveChangesAsync();
        try {
            var queries=scope.ServiceProvider.GetRequiredService<IProcessingQueries>();
            var page=await queries.ListAsync(PageRequest.Create(1,1).Value,null,default);
            Assert.AreEqual(1L,page.TotalCount);Assert.AreEqual(own,page.Items.Single().DocumentId);
            Assert.IsNull(await queries.GetByIdAsync(jobs[1].Id.Value,default));
            Assert.IsNotNull(await queries.GetByIdAsync(jobs[0].Id.Value,default));
            Assert.AreEqual(0L,(await queries.ListAsync(PageRequest.Create(1,25).Value,"Failed",default)).TotalCount);
            visibility.Fail=true;
            await Assert.ThrowsAsync<InvalidOperationException>(()=>queries.ListAsync(PageRequest.Create(1,25).Value,null,default));
        } finally {db.Set<ProcessingJob>().RemoveRange(jobs);await db.SaveChangesAsync();}
    }
}
