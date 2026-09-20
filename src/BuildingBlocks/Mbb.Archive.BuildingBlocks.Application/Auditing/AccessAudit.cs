namespace Mbb.Archive.BuildingBlocks.Application.Auditing;

/// <summary>
/// Erişim denetimi kaydı. §13 gereği görüntüleme, indirme, önizleme, dışa
/// aktarma ve yetki değişikliği gibi kullanıcı kaynaklı işlemler pipeline
/// olaylarından ayrı olarak kayıt altına alınır.
/// </summary>
/// <param name="EventName">Denetim günlüğüne yazılacak olay adı.</param>
/// <param name="EntityType">Erişilen kaynağın türü (document, role, ...).</param>
/// <param name="EntityId">Erişilen kaynağın kimliği; yoksa null.</param>
/// <param name="Actor">İşlemi yapan öznenin kimliği.</param>
/// <param name="IpAddress">İstemci IP adresi.</param>
/// <param name="UserAgent">Kısaltılmış user agent.</param>
/// <param name="CorrelationId">İstek korelasyon kimliği.</param>
/// <param name="Outcome">succeeded | denied | failed</param>
public sealed record AccessAuditRecord(
    string EventName,
    string EntityType,
    string? EntityId,
    string Actor,
    string? IpAddress,
    string? UserAgent,
    string? CorrelationId,
    string Outcome,
    string? ActorDisplayName = null);

/// <summary>
/// Erişim denetim kaydını denetim günlüğüne iletir. Uygulama isteğinin
/// başarısı bu yazımın başarısına bağlanmaz; denetim yazımı başarısız olursa
/// hata loglanır, kullanıcı isteği bozulmaz.
/// </summary>
public interface IAccessAuditor
{
    Task RecordAsync(
        AccessAuditRecord record,
        CancellationToken cancellationToken);
}
