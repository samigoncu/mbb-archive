using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.Extensions.Options;
using Mbb.Archive.Modules.Documents.Application.Settings;
using Mbb.Archive.Modules.Documents.Domain.Settings;
using Mbb.Archive.Modules.Documents.Infrastructure.Storage;
namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
internal sealed class UploadPolicyStore(DocumentsDbContext db, IOptions<FileStagingOptions> options) : IUploadPolicyStore
{
    public long InfrastructureMaxBytes => options.Value.MaxUploadBytes;
    public Task<UploadPolicy> GetAsync(CancellationToken ct) => db.Set<UploadPolicy>().SingleAsync(x => x.Id == 1, ct);
}
internal sealed class UploadPolicyConfiguration : IEntityTypeConfiguration<UploadPolicy>
{
    public void Configure(EntityTypeBuilder<UploadPolicy> b)
    {
        b.ToTable("upload_policy", "documents");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
        b.Property(x => x.MaxFileSizeMb).HasColumnName("max_file_size_mb");
        b.Property(x => x.Version).HasColumnName("version").IsConcurrencyToken();
        b.Property(x => x.UpdatedBy).HasColumnName("updated_by").HasMaxLength(200);
        b.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        b.HasData(new UploadPolicy());
    }
}
