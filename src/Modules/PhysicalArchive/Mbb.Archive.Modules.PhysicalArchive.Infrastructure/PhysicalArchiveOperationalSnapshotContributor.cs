using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.PhysicalArchive.Domain.Loans;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure;

internal sealed class PhysicalArchiveOperationalSnapshotContributor :
    IOperationalSnapshotContributor
{
    private readonly PhysicalArchiveDbContext _db;
    private readonly TimeProvider _timeProvider;

    public PhysicalArchiveOperationalSnapshotContributor(
        PhysicalArchiveDbContext db,
        TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public string Component => "physical_archive";

    public async Task<OperationalComponentSnapshot> CollectAsync(
        CancellationToken cancellationToken)
    {
        var now = _timeProvider.GetUtcNow();

        var folders = await _db.Folders.AsNoTracking().LongCountAsync(
            cancellationToken);

        var overdue = await _db.Loans.AsNoTracking().LongCountAsync(
            x =>
                x.Status != PhysicalLoanStatus.Returned
                && x.DueAt < now,
            cancellationToken);

        var outboxPending = await _db.OutboxMessages.AsNoTracking().LongCountAsync(
            cancellationToken);

        // Gecikmiş ödünç teknik bir arıza değil, olağan bir iş durumudur:
        // personel dosyayı zamanında iade etmemiştir, sistem sorunsuz çalışır.
        // Tek bir gecikme modülü "bozuk" göstermek, panoyu sürekli sarı
        // tutar ve gerçek arıza fark edilmez hâle gelirdi.
        //
        // Sağlığı yalnız teknik sinyal belirler: giden kutusu birikiyorsa
        // mesajlar işlenmiyor demektir. Gecikme ancak yığılma boyutuna
        // ulaştığında — takibin tamamen durduğunu gösterir — uyarıya döner.
        const int overdueAlertThreshold = 50;

        var health = outboxPending > 500
            ? OperationalHealth.Unhealthy
            : outboxPending > 100
                ? OperationalHealth.Degraded
                : OperationalHealth.Healthy;

        return new OperationalComponentSnapshot(
            Component,
            health,
            now,
            [
                new("folders", folders),
                // Ölçüm olarak kalır: operasyon ekranı sayıyı gösterir,
                // ama sağlık durumunu belirlemez.
                new("loans_overdue", overdue, Description: "İade tarihi geçmiş ödünç kaydı"),
                new("outbox_pending", outboxPending)
            ],
            overdue >= overdueAlertThreshold
                ? [new(OperationalHealth.Degraded, "physical_archive.loan_overdue",
                    $"İade tarihi geçmiş {overdue} ödünç kaydı var; ödünç takibi durmuş olabilir.")]
                : []);
    }
}
