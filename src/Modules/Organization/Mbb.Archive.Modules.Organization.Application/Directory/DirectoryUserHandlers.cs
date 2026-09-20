using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Organization.Domain.Directory;

namespace Mbb.Archive.Modules.Organization.Application.Directory;

public interface IDirectoryUserStore
{
    Task<DirectoryUserRecord?> GetAsync(string subjectId, CancellationToken ct);
    /// <param name="limit">En çok kaç kayıt; çağıran bir fazlasını alır.</param>
    Task<IReadOnlyList<DirectoryUserRecord>> SearchAsync(string? search, int limit, CancellationToken ct);
    Task AddAsync(DirectoryUserRecord record, CancellationToken ct);
}

/// <summary>Dizinden tek kullanıcının künyesini okur; bulunamazsa null.</summary>
public interface IDirectoryLookup
{
    Task<DirectoryProfile?> FindAsync(string subjectId, CancellationToken ct);
}

public sealed record DirectoryProfile(
    string DisplayName, string? Email, string? Title, string? UnitReference, bool IsActive);

public sealed record DirectoryUserView(
    string SubjectId, string DisplayName, string? Email, string? Title, string? UnitReference,
    bool IsActive, string Source, DateTimeOffset CreatedAt,
    DateTimeOffset? LastSyncedAt, DateTimeOffset? LastSeenAt);

public sealed record SaveDirectoryUser(string DisplayName, string? Email, string? Title, bool IsActive);

/// <summary>
/// Künye listesinin bir sayfası.
/// </summary>
/// <remarks>
/// Liste sınırsız dönemez: kullanıcı listesi bu kimlikleri erişim modülüne
/// geri gönderdiği için büyük kurumda her ekran açılışında binlerce kimlik
/// taşınırdı. <see cref="HasMore"/> doğruysa arayüz aramayla daraltmayı ister.
/// </remarks>
public sealed record DirectoryUserPage(IReadOnlyList<DirectoryUserView> Items, bool HasMore);

/// <summary>
/// Kullanıcı künyesini açan ve tazeleyen tek yazma noktası.
/// </summary>
/// <remarks>
/// <para>
/// Hem ilk giriş hem yönetici eşitlemesi buradan geçer. İki ayrı yazma yolu
/// olsaydı biri diğerinin doldurmadığı alanı boş bırakabilir, kaynak ve
/// zaman damgaları çelişebilirdi.
/// </para>
/// <para>
/// Kayıt bir kimlik doğrulama hesabı değildir ve <em>erişim vermez</em>: rol
/// ile birim ataması ayrı yapılır. Bu yüzden girişte kayıt açmak güvenli.
/// </para>
/// </remarks>
public sealed class DirectoryUserProvisioning(IDirectoryUserStore store, TimeProvider time)
{
    /// <param name="profile">
    /// Dizinden okunan künye; dizin kapalı ya da kişi bulunamamışsa null.
    /// </param>
    public async Task<DirectoryUserRecord> UpsertAsync(
        string subjectId, DirectoryProfile? profile, CancellationToken ct)
    {
        var now = time.GetUtcNow();
        var record = await store.GetAsync(subjectId, ct);

        if (record is null)
        {
            record = DirectoryUserRecord.Create(subjectId, "Directory", now);
            await store.AddAsync(record, ct);
        }

        // Yöneticinin elle girdiği künye dizin eşitlemesiyle ezilmez; aksi
        // hâlde dizindeki eksik ya da yanlış ad her eşitlemede geri gelirdi.
        if (profile is not null && record.Source != "Manual")
        {
            record.ApplyDirectory(profile.DisplayName, profile.Email, profile.Title,
                profile.UnitReference, profile.IsActive, now);
        }

        return record;
    }
}

public sealed class DirectoryUserHandlers(
    IDirectoryUserStore store,
    DirectoryUserProvisioning provisioning,
    IDirectoryLookup lookup,
    IDirectoryRuntime runtime,
    IUnitOfWork<OrganizationBoundary> uow,
    ICurrentUserPermissions user,
    TimeProvider time)
{
    /// <summary>En çok <paramref name="limit"/> künye; fazlası varsa bildirilir.</summary>
    public async Task<DirectoryUserPage> SearchAsync(string? search, int limit, CancellationToken ct)
    {
        var size = Math.Clamp(limit, 1, 1000);
        var found = await store.SearchAsync(search, size, ct);
        return new DirectoryUserPage(found.Take(size).Select(View).ToList(), found.Count > size);
    }

    /// <summary>
    /// Giriş yapan kullanıcının kendi kaydını açar ya da tazeler.
    /// </summary>
    /// <remarks>
    /// Özne jetondan gelir, istemciden değil: aksi hâlde herhangi bir kullanıcı
    /// başkasının künyesini yazabilirdi. Dizine ulaşılamazsa kayıt yine açılır;
    /// künye sonraki eşitlemede dolar. Hiçbir durumda rol atanmaz.
    /// </remarks>
    public async Task<Result<DirectoryUserView>> RecordSignInAsync(CancellationToken ct)
    {
        var subjectId = user.Subject;
        if (string.IsNullOrWhiteSpace(subjectId) || subjectId == "anonymous")
            return Result<DirectoryUserView>.Failure(
                Error.Validation("organization.directory_user_unknown", "Oturum kimliği okunamadı."));

        var settings = runtime.Current;
        var existing = await store.GetAsync(subjectId, ct);

        // Girişte kayıt açma kapalıyken var olan kaydın yalnız son görülme
        // zamanı güncellenir; yeni kayıt açılmaz.
        if (existing is null && !settings.ProvisionOnLogin)
            return Result<DirectoryUserView>.Failure(
                Error.Conflict("organization.directory_provision_disabled",
                    "İlk girişte kullanıcı kaydı açma kapalı."));

        var profile = settings.IsConfigured ? await lookup.FindAsync(subjectId, ct) : null;
        var record = await provisioning.UpsertAsync(subjectId, profile, ct);
        record.MarkSeen(time.GetUtcNow());

        await uow.SaveChangesAsync(ct);
        return Result<DirectoryUserView>.Success(View(record));
    }

    /// <summary>Yöneticinin künyeyi elle düzeltmesi; kayıt "Manual" olur.</summary>
    public async Task<Result<DirectoryUserView>> SaveAsync(
        string subjectId, SaveDirectoryUser request, CancellationToken ct)
    {
        var record = await store.GetAsync(subjectId, ct);
        if (record is null)
        {
            try { record = DirectoryUserRecord.Create(subjectId, "Manual", time.GetUtcNow()); }
            catch (DomainRuleViolationException exception)
            {
                return Result<DirectoryUserView>.Failure(
                    Error.Validation("organization.directory_user_invalid", exception.Message));
            }

            await store.AddAsync(record, ct);
        }

        try { record.ApplyManual(request.DisplayName, request.Email, request.Title, request.IsActive); }
        catch (DomainRuleViolationException exception)
        {
            return Result<DirectoryUserView>.Failure(
                Error.Validation("organization.directory_user_invalid", exception.Message));
        }

        await uow.SaveChangesAsync(ct);
        return Result<DirectoryUserView>.Success(View(record));
    }

    internal static DirectoryUserView View(DirectoryUserRecord record) => new(
        record.SubjectId, record.DisplayName, record.Email, record.Title, record.UnitReference,
        record.IsActive, record.Source, record.CreatedAt, record.LastSyncedAt, record.LastSeenAt);
}
