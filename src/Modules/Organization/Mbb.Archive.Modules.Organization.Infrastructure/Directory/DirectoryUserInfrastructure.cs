using Microsoft.EntityFrameworkCore;
using Mbb.Archive.Modules.Organization.Application.Directory;
using Mbb.Archive.Modules.Organization.Domain.Directory;
using Mbb.Archive.Modules.Organization.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

internal sealed class EfDirectoryUserStore(OrganizationDbContext db) : IDirectoryUserStore
{
    public Task<DirectoryUserRecord?> GetAsync(string subjectId, CancellationToken ct)
        => db.DirectoryUsers.FirstOrDefaultAsync(x => x.SubjectId == subjectId, ct);

    public async Task<IReadOnlyList<DirectoryUserRecord>> SearchAsync(string? search, int limit, CancellationToken ct)
    {
        var query = db.DirectoryUsers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            // Ad soyad ya da ham kimlik: yönetici hangisini biliyorsa onunla arar.
            var pattern = $"%{search.Trim()}%";
            query = query.Where(x =>
                EF.Functions.ILike(x.DisplayName, pattern) ||
                EF.Functions.ILike(x.SubjectId, pattern) ||
                (x.Email != null && EF.Functions.ILike(x.Email, pattern)));
        }

        // Bir fazlası istenir: çağıran "daha var" bilgisini ikinci sorgu
        // atmadan anlar ve kullanıcıya aramayı daraltmasını söyleyebilir.
        return await query.OrderBy(x => x.DisplayName).Take(limit + 1).ToListAsync(ct);
    }

    public Task AddAsync(DirectoryUserRecord record, CancellationToken ct)
        => db.DirectoryUsers.AddAsync(record, ct).AsTask();
}

/// <summary>
/// Künyeyi LDAP'tan okur.
/// </summary>
/// <remarks>
/// Dizin erişilemezse hata fırlatmaz, <c>null</c> döner: dizin geçici olarak
/// çökmüşken kullanıcının uygulamaya girememesi kabul edilemez — kimlik
/// doğrulaması zaten kimlik sağlayıcıda yapılmış durumdadır.
/// </remarks>
internal sealed class LdapDirectoryLookup(IDirectoryClient client) : IDirectoryLookup
{
    public async Task<DirectoryProfile?> FindAsync(string subjectId, CancellationToken ct)
    {
        if (!client.IsConfigured) return null;

        var found = await client.FindUserAsync(subjectId, ct);
        if (found.IsFailure) return null;

        var user = found.Value;
        return new DirectoryProfile(user.DisplayName, user.Email, user.Title, user.UnitReference, user.IsActive);
    }
}
