using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Operations.Application.Siem;
using Mbb.Archive.Modules.Operations.Domain.Alerts;
using Mbb.Archive.Modules.Operations.Domain.Notifications;
using Mbb.Archive.Modules.Operations.Domain.Storage;
using Mbb.Archive.Modules.Operations.Domain.Verifications;

namespace Mbb.Archive.Modules.Operations.UnitTests;

[TestClass]
public sealed class OperationsIntelligenceTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 2, 12, 0, 0, TimeSpan.Zero);

    [TestMethod]
    public void Alert_ObservationDeduplicatesAndResolvedAlertReopens()
    {
        var alert = AlertInstance.Open(Guid.CreateVersion7(), "processing:failed", AlertSeverity.Warning, 4, Now);
        alert.Observe(6, AlertSeverity.Critical, Now.AddMinutes(1));
        alert.Resolve(Now.AddMinutes(2));
        alert.Observe(2, AlertSeverity.Warning, Now.AddMinutes(3));
        Assert.AreEqual(3, alert.OccurrenceCount);
        Assert.AreEqual(AlertStatus.Open, alert.Status);
        Assert.IsNull(alert.ResolvedAt);
    }

    [TestMethod]
    public void InvalidAlertThreshold_IsRejected()
        => Assert.ThrowsExactly<DomainRuleViolationException>(() => AlertRule.Create(
            "failed-jobs", "processing_failed", AlertComparison.GreaterThan, -1,
            AlertSeverity.Critical, TimeSpan.FromMinutes(5), Now));

    [TestMethod]
    public void NotificationFailure_RetriesThenDeadLetters()
    {
        var delivery = NotificationDelivery.Queue(NotificationChannel.Webhook, "https://alerts.invalid", Now);
        delivery.BeginAttempt(); delivery.MarkFailed("timeout", Now, 2);
        Assert.AreEqual(NotificationDeliveryStatus.RetryScheduled, delivery.Status);
        Assert.AreEqual(Now.AddMinutes(1), delivery.NextAttemptAt);
        delivery.BeginAttempt(); delivery.MarkFailed("timeout", Now.AddMinutes(1), 2);
        Assert.AreEqual(NotificationDeliveryStatus.DeadLettered, delivery.Status);
    }

    [TestMethod]
    public void StorageForecast_UsesExplainableDailyGrowth()
    {
        var snapshots = new[]
        {
            StorageCapacitySnapshot.Capture(100, 50, 1_000, Now),
            StorageCapacitySnapshot.Capture(200, 50, 1_000, Now.AddDays(10))
        };
        var forecast = StorageGrowthForecast.Calculate(snapshots, Now.AddDays(10));
        Assert.AreEqual(10d, forecast.DailyGrowthBytes);
        Assert.AreEqual(550L, forecast.Forecast30Days);
        Assert.AreEqual(75, forecast.EstimatedDaysRemaining);
    }

    [TestMethod]
    public void SiemSerialization_RemovesSensitiveFieldsAndHashesSubject()
    {
        var value = new SiemEvent("document.download", Now, "denied", "warning", "user-42", "10.0.0.1",
            new Dictionary<string, string> { ["documentClass"] = "internal", ["ocrText"] = "secret", ["token"] = "secret" });
        var json = SiemEventSerializer.ToJsonLine(value);
        Assert.IsFalse(json.Contains("secret", StringComparison.Ordinal));
        Assert.IsFalse(json.Contains("user-42", StringComparison.Ordinal));
        Assert.IsTrue(json.Contains("documentClass", StringComparison.Ordinal));
    }

    [TestMethod]
    public void VerificationEvidence_HashChangesWithReport()
    {
        var first = VerificationEvidencePackage.Generate(Guid.Empty, "fixity", Now, Now.AddMinutes(1),
            "Failed", 2, 1, "{\"failed\":1}", Now.AddMinutes(2), "1.4.0");
        var second = VerificationEvidencePackage.Generate(Guid.Empty, "fixity", Now, Now.AddMinutes(1),
            "Failed", 2, 1, "{\"failed\":2}", Now.AddMinutes(2), "1.4.0");
        Assert.AreNotEqual(first.Sha256, second.Sha256);
        Assert.AreEqual(64, first.Sha256.Length);
    }
}
