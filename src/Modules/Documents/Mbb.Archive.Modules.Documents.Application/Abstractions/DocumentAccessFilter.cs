using System.Linq.Expressions;
using Mbb.Archive.BuildingBlocks.Application.Security;
using Mbb.Archive.Modules.Documents.Domain.Documents;

namespace Mbb.Archive.Modules.Documents.Application.Abstractions;

/// <summary>
/// Kapsam yükleminin tek tanımı. Liste, tekil erişim ve içerik indirme aynı
/// ifadeyi kullanır; "listede görünmüyor ama doğrudan bağlantıyla açılıyor"
/// sınıfı açık böylece imkânsız hâle gelir (§21).
/// <para>
/// Yüklem sorguya gömülür, sonradan süzme yapılmaz: sonradan süzmek sayfalama
/// ve toplam sayıyı bozar.
/// </para>
/// </summary>
public static class DocumentAccessFilter
{
    /// <summary>
    /// Kapsamın izin verdiği belgeleri seçen ifade.
    /// <list type="bullet">
    /// <item>Kapsam üstü izin varsa süzgeç uygulanmaz.</item>
    /// <item>Sahibi birim, öznenin birim yollarından biriyle başlıyorsa görünür
    /// (alt birimler de kapsanır).</item>
    /// <item>Doğrudan paylaşılan belgeler her hâlükârda görünür.</item>
    /// <item>Sahibi olmayan belge <em>görünmez</em>: geri doldurulmamış kayıt
    /// sessizce herkese açılmaz.</item>
    /// </list>
    /// </summary>
    public static Expression<Func<Document, bool>> For(AccessScope scope)
    {
        if (scope.Unrestricted)
            return _ => true;

        if (scope.SeesNothing)
            return _ => false;

        var paths = scope.UnitPaths.ToArray();

        // Güçlü tipli anahtarla karşılaştırılır: dönüştürülmüş anahtar üzerinde
        // .Value okuyan bir Contains EF tarafından çevrilemiyor.
        var documentIds = scope.GrantedDocumentIds
            .Select(id => new DocumentId(id))
            .ToArray();
        var filePlanCodes = scope.GrantedFilePlanCodes
            .Select(code => code.ToUpperInvariant())
            .ToArray();

        return document =>
            documentIds.Contains(document.Id)
            || (document.FilePlanCode != null && filePlanCodes.Contains(document.FilePlanCode))
            || (document.OwnerUnitPath != null
                && paths.Any(path => document.OwnerUnitPath.StartsWith(path)));
    }

    /// <summary>
    /// Tekil erişim kararı. Sorgu yüklemiyle aynı kuralı bellek üzerinde
    /// uygular; ikisi ayrışırsa liste ile tekil erişim çelişir.
    /// </summary>
    public static bool Allows(
        AccessScope scope,
        Guid documentId,
        string? ownerUnitPath,
        string? filePlanCode = null)
    {
        if (scope.Unrestricted)
            return true;

        if (scope.GrantedDocumentIds.Contains(documentId))
            return true;

        if (filePlanCode is not null
            && scope.GrantedFilePlanCodes.Contains(filePlanCode, StringComparer.OrdinalIgnoreCase))
        {
            return true;
        }

        if (ownerUnitPath is null)
            return false;

        return scope.UnitPaths.Any(
            path => ownerUnitPath.StartsWith(path, StringComparison.Ordinal));
    }
}
