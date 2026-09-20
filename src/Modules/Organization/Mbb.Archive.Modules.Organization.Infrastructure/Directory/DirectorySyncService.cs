using Microsoft.Extensions.Logging;
using Mbb.Archive.Modules.Organization.Application.Directory;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Organization.Application;
using Mbb.Archive.Modules.Organization.Application.Abstractions;
using Mbb.Archive.Modules.Organization.Domain.Units;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Directory;

/// <summary>
/// Dizindeki birim ağacını ve kullanıcı üyeliklerini arşive eşitler.
/// <para>
/// Elle verilmiş üyelikler korunur: dizin eşitlemesi yalnız kendi yazdığı
/// (<see cref="MembershipSource.Directory"/>) kayıtları yönetir. Aksi hâlde bir
/// eşitleme, operatörün bilinçli olarak verdiği vekâleti sessizce silerdi.
/// </para>
/// </summary>
public sealed class DirectorySyncService
{
    private readonly IDirectoryClient _directory;
    private readonly DirectoryUserProvisioning _provisioning;
    private readonly IOrganizationRepository _repository;
    private readonly IUnitOfWork<OrganizationBoundary> _unitOfWork;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<DirectorySyncService> _logger;

    public DirectorySyncService(
        IDirectoryClient directory,
        DirectoryUserProvisioning provisioning,
        IOrganizationRepository repository,
        IUnitOfWork<OrganizationBoundary> unitOfWork,
        TimeProvider timeProvider,
        ILogger<DirectorySyncService> logger)
    {
        _directory = directory;
        _provisioning = provisioning;
        _repository = repository;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    /// <summary>
    /// Dizindeki organizationalUnit ağacını arşive yansıtır. Var olan birimler
    /// silinmez; yalnız eksik olanlar eklenir ve dizin referansı bağlanır.
    /// </summary>
    public async Task<Result<DirectorySyncReport>> SyncUnitsAsync(
        CancellationToken cancellationToken)
    {
        if (!_directory.IsConfigured)
        {
            return Result<DirectorySyncReport>.Failure(
                Error.Failure(
                    "directory.not_configured",
                    "An LDAP directory is not configured."));
        }

        var listed = await _directory.ListUnitsAsync(cancellationToken);

        if (listed.IsFailure)
            return Result<DirectorySyncReport>.Failure(listed.Error);

        if (listed.Value.GroupBy(x => ToCode(x.Name)).Any(g => g.Key is not null && g.Count() > 1))
            return Result<DirectorySyncReport>.Failure(Error.Conflict("directory.ambiguous_units", "Aynı birim koduna dönüşen dizin birimleri var; eşleştirmeyi düzeltin."));
        var warnings = new List<string>();
        var created = 0;
        var linked = 0;
        var now = _timeProvider.GetUtcNow();

        // Üst birim önce oluşsun diye DN uzunluğuna göre sırala: kısa DN üsttedir.
        var ordered = listed.Value.OrderBy(x => x.DistinguishedName.Length).ToArray();
        var byDn = new Dictionary<string, OrganizationUnit>(StringComparer.OrdinalIgnoreCase);

        foreach (var directoryUnit in ordered)
        {
            var code = ToCode(directoryUnit.Name);

            if (code is null)
            {
                warnings.Add($"'{directoryUnit.Name}' birim kodu üretilemedi, atlandı.");
                continue;
            }

            var existing = await _repository.FindUnitByCodeAsync(code, cancellationToken);

            if (existing is not null)
            {
                if (existing.IsRemoved || !existing.IsActive ||
                    (existing.ExternalReference is not null && !existing.ExternalReference.Equals(directoryUnit.DistinguishedName, StringComparison.OrdinalIgnoreCase)))
                    return Result<DirectorySyncReport>.Failure(Error.Conflict("directory.unit_conflict", $"{code} birimi farklı bir dizin kaydına bağlı veya etkin değil."));
                if (existing.ExternalReference is null)
                {
                    existing.LinkToDirectory(directoryUnit.DistinguishedName);
                    linked++;
                }

                byDn[directoryUnit.DistinguishedName] = existing;
                continue;
            }

            OrganizationUnit unit;

            if (directoryUnit.ParentDistinguishedName is { } parentDn
                && byDn.TryGetValue(parentDn, out var parent))
            {
                unit = parent.CreateChild(
                    code,
                    directoryUnit.Name,
                    null,
                    directoryUnit.DistinguishedName,
                    now);
            }
            else
            {
                unit = OrganizationUnit.CreateRoot(
                    code,
                    directoryUnit.Name,
                    null,
                    directoryUnit.DistinguishedName,
                    now);
            }

            await _repository.AddUnitAsync(unit, cancellationToken);
            byDn[directoryUnit.DistinguishedName] = unit;
            created++;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Directory unit sync finished. Created {Created}, linked {Linked}.",
            created,
            linked);

        return Result<DirectorySyncReport>.Success(
            new DirectorySyncReport(created, linked, 0, warnings));
    }

    /// <summary>
    /// Tek bir kullanıcının birim üyeliğini dizinden tazeler. Oturum açışta
    /// çağrılabilir; dizinden gelen üyelik birincil olur, elle verilenler kalır.
    /// </summary>
    public async Task<Result<DirectorySyncReport>> SyncUserAsync(
        string subjectId,
        CancellationToken cancellationToken,
        string? directoryUserName = null)
    {
        if (!_directory.IsConfigured)
        {
            return Result<DirectorySyncReport>.Failure(
                Error.Failure("directory.not_configured", "An LDAP directory is not configured."));
        }

        var found = await _directory.FindUserAsync(directoryUserName ?? subjectId, cancellationToken);

        if (found.IsFailure)
            return Result<DirectorySyncReport>.Failure(found.Error);

        // Künye, girişte kullanılan upsert'in aynısından geçer: iki yolun
        // birbirinden farklı kayıt üretmesi mümkün olmasın.
        await _provisioning.UpsertAsync(
            subjectId,
            new DirectoryProfile(found.Value.DisplayName, found.Value.Email, found.Value.Title,
                found.Value.UnitReference, found.Value.IsActive),
            cancellationToken);

        var memberships = await _repository.GetMembershipsAsync(subjectId, cancellationToken);
        OrganizationUnit? unit = null;
        if (found.Value.IsActive && !string.IsNullOrWhiteSpace(found.Value.UnitReference))
        {
            var code = ToCode(found.Value.UnitReference);
            unit = code is null ? null : await _repository.FindUnitByCodeAsync(code, cancellationToken);
            if (unit is null || !unit.IsActive || unit.IsRemoved)
                return Result<DirectorySyncReport>.Failure(Error.Conflict("directory.unit_not_mapped",
                    "Dizin kullanıcısının birimi etkin bir arşiv birimiyle eşleşmiyor; önce birim eşitlemesini tamamlayın."));
        }
        var removed = 0;
        foreach (var membership in memberships.Where(x => x.Source == MembershipSource.Directory && (unit is null || x.UnitId != unit.Id)))
        { _repository.RemoveMembership(membership); removed++; }
        var existing = unit is null ? null : memberships.FirstOrDefault(x => x.UnitId == unit.Id);
        var assigned = 0;
        if (unit is not null && existing is null)
        {
            var hasManualPrimary = memberships.Any(x => x.Source == MembershipSource.Manual && x.IsPrimary);
            await _repository.AddMembershipAsync(UnitMembership.Create(subjectId, unit.Id, !hasManualPrimary,
                MembershipSource.Directory, _timeProvider.GetUtcNow()), cancellationToken);
            assigned = 1;
        }
        // Manual grants, including their primary flag, are never modified by directory synchronization.
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        IReadOnlyList<string> warnings = unit is null
            ? ["Dizindeki hesap pasif veya birimsiz: yalnız dizin kaynaklı üyelikler kaldırıldı; elle verilen yetkiler ayrıca gözden geçirilmelidir."] : [];
        return Result<DirectorySyncReport>.Success(new(0, 0, assigned, warnings, removed));
    }

    /// <summary>
    /// Dizindeki ada karşılık gelen birim kodunu üretir. Türkçe karakterler
    /// sadeleştirilir; boşluk yerine tire konur.
    /// </summary>
    internal static string? ToCode(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return null;

        var map = new Dictionary<char, char>
        {
            ['ç'] = 'C', ['Ç'] = 'C', ['ğ'] = 'G', ['Ğ'] = 'G',
            ['ı'] = 'I', ['İ'] = 'I', ['ö'] = 'O', ['Ö'] = 'O',
            ['ş'] = 'S', ['Ş'] = 'S', ['ü'] = 'U', ['Ü'] = 'U'
        };

        var builder = new System.Text.StringBuilder(name.Length);

        foreach (var character in name.Trim())
        {
            var mapped = map.TryGetValue(character, out var replacement)
                ? replacement
                : char.ToUpperInvariant(character);

            if (char.IsAsciiLetterOrDigit(mapped))
                builder.Append(mapped);
            else if (mapped is ' ' or '-' or '_' && builder.Length > 0 && builder[^1] != '-')
                builder.Append('-');
        }

        var code = builder.ToString().Trim('-');

        if (code.Length == 0)
            return null;

        return code.Length <= 40 ? code : code[..40].TrimEnd('-');
    }
}
