using System.Linq.Expressions;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Archive.Domain.Records;

namespace Mbb.Archive.Modules.Archive.Application.Abstractions;

/// <summary>
/// Kayıt beyanı listesinin kapsam yüklemi. Belge listesindeki kuralın aynısını
/// arşiv kaydı üzerinde uygular: kayıt, belgenin künyesidir ve belgeyi
/// göremeyen kullanıcı künyesini de görmemelidir (§21).
/// <para>
/// Yüklem sorguya gömülür; sonradan süzmek sayfa boyutunu ve toplam sayıyı
/// bozar, "kaç kayıt var" sorusunun cevabını sızdırır.
/// </para>
/// </summary>
public static class ArchiveRecordAccessFilter
{
    public static Expression<Func<ArchiveRecord, bool>> For(AccessScope scope)
    {
        if (scope.Unrestricted)
            return _ => true;

        if (scope.SeesNothing)
            return _ => false;

        var paths = scope.UnitPaths.ToArray();
        var documentIds = scope.GrantedDocumentIds.ToArray();
        var filePlanCodes = scope.GrantedFilePlanCodes
            .Select(code => code.ToUpperInvariant())
            .ToArray();

        return record =>
            documentIds.Contains(record.DocumentId)
            || (record.ClassificationCode != null
                && filePlanCodes.Contains(record.ClassificationCode))
            || (record.OwnerUnitPath != null
                && paths.Any(path => record.OwnerUnitPath.StartsWith(path)));
    }

    /// <summary>
    /// Tekil erişim kararı; liste yüklemiyle aynı kuralı bellek üzerinde
    /// uygular. İkisi ayrışırsa liste ile doğrudan bağlantı çelişir.
    /// </summary>
    public static bool Allows(
        AccessScope scope,
        Guid documentId,
        string? ownerUnitPath,
        string? classificationCode = null)
    {
        if (scope.Unrestricted)
            return true;

        if (scope.GrantedDocumentIds.Contains(documentId))
            return true;

        if (classificationCode is not null
            && scope.GrantedFilePlanCodes.Contains(
                classificationCode,
                StringComparer.OrdinalIgnoreCase))
        {
            return true;
        }

        if (ownerUnitPath is null)
            return false;

        return scope.UnitPaths.Any(
            path => ownerUnitPath.StartsWith(path, StringComparison.Ordinal));
    }
}
