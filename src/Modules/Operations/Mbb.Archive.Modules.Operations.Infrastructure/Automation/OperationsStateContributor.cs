using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Operations.Domain.Alerts;
using Mbb.Archive.Modules.Operations.Domain.Notifications;
using Mbb.Archive.Modules.Operations.Domain.Recovery;
using Mbb.Archive.Modules.Operations.Infrastructure.Persistence;

namespace Mbb.Archive.Modules.Operations.Infrastructure.Automation;
internal sealed class OperationsStateContributor(OperationsDbContext db, TimeProvider time) : IOperationalSnapshotContributor
{
    public string Component => "operations";
    public async Task<OperationalComponentSnapshot> CollectAsync(CancellationToken ct)
    {
        var open = await db.AlertInstances.CountAsync(x => x.Status != AlertStatus.Resolved, ct);
        var critical = await db.AlertInstances.CountAsync(x => x.Status != AlertStatus.Resolved && x.Severity == AlertSeverity.Critical, ct);
        var failed = await db.NotificationDeliveries.CountAsync(x => x.Status == NotificationDeliveryStatus.DeadLettered || x.Status == NotificationDeliveryStatus.RetryScheduled, ct);
        var drills = await db.RecoveryDrills.CountAsync(x => x.Status == RecoveryDrillStatus.Failed, ct);
        return new(Component, failed > 0 || critical > 0 ? OperationalHealth.Degraded : OperationalHealth.Healthy, time.GetUtcNow(),
            [new("alert_open_total", open), new("alert_critical_total", critical), new("notification_failure_total", failed), new("recovery_drill_failures", drills)],
            failed > 0 ? [new(OperationalHealth.Degraded, "operations.notification_failed", "Başarısız veya yeniden denenecek bildirimler var.")] : []);
    }
}
