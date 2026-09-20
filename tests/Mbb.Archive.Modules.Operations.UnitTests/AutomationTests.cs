using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Operations.Application.Automation;
using Mbb.Archive.Modules.Operations.Application.Notifications;
using Mbb.Archive.Modules.Operations.Domain.Alerts;
using Mbb.Archive.Modules.Operations.Domain.Notifications;
using Mbb.Archive.Modules.Operations.Domain.Recovery;
namespace Mbb.Archive.Modules.Operations.UnitTests;
[TestClass]
public sealed class AutomationTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-09-17T10:00:00Z");
    private static AlertRule Rule() => AlertRule.Create("queue", "jobs_active", AlertComparison.GreaterThan, 5, AlertSeverity.Warning, TimeSpan.FromMinutes(1), Now);
    [TestMethod] public void WindowRequiresContinuousMeasurementsAndResolvesOnRecovery()
    {
        var rule = Rule();
        Assert.IsNull(AlertEvaluation.Apply(rule, null, 10, Now));
        Assert.IsNull(AlertEvaluation.Apply(rule, null, 10, Now.AddSeconds(30)));
        var alert = AlertEvaluation.Apply(rule, null, 10, Now.AddMinutes(1));
        Assert.IsNotNull(alert);
        Assert.AreSame(alert, AlertEvaluation.Apply(rule, alert, 12, Now.AddSeconds(90)));
        Assert.AreEqual(2, alert.OccurrenceCount);
        Assert.AreSame(alert, AlertEvaluation.Apply(rule, alert, 1, Now.AddMinutes(2)));
        Assert.AreEqual(AlertStatus.Resolved, alert.Status);
    }
    [TestMethod] public void MissingOrStaleMeasurementsCannotOpenOrResolveAlarms()
    {
        var rule = Rule(); AlertEvaluation.Apply(rule, null, 10, Now);
        AlertEvaluation.Apply(rule, null, null, Now.AddSeconds(30));
        Assert.IsNull(AlertEvaluation.Apply(rule, null, 10, Now.AddMinutes(1)));
        Assert.IsNull(AlertEvaluation.Apply(rule, null, 10, Now.AddMinutes(5)));
        var alert = AlertInstance.Open(rule.Id, "queue", AlertSeverity.Warning, 10, Now);
        AlertEvaluation.Apply(rule, alert, null, Now.AddMinutes(6));
        Assert.AreEqual(AlertStatus.Open, alert.Status);
    }
    [TestMethod] public void NotificationTargetsRejectUnsafeOrUnsupportedProviders()
    {
        var rule = Rule();
        Assert.ThrowsExactly<DomainRuleViolationException>(() => rule.SetNotification(NotificationChannel.Webhook, "http://host/"));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => rule.SetNotification(NotificationChannel.Webhook, "https://user:secret@host/"));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => rule.SetNotification(NotificationChannel.Email, "invalid"));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => rule.SetNotification(NotificationChannel.Sms, "123"));
    }
    [TestMethod] public async Task MissingProviderFailsExplicitlyAndRetriesTerminate()
    {
        var dispatcher = new NotificationDispatcher([]);
        var item = NotificationDelivery.ForAlert(Guid.NewGuid(), NotificationChannel.Email, "operator@example.invalid", "Alarm", "Details", Now);
        for (var i = 0; i < 5; i++) await dispatcher.SendAsync(item, Now.AddHours(i), default);
        Assert.AreEqual(NotificationDeliveryStatus.DeadLettered, item.Status);
        Assert.IsNull(item.SentAt); Assert.IsFalse(string.IsNullOrWhiteSpace(item.LastError));
        item.Retry(Now.AddDays(1)); Assert.AreEqual(NotificationDeliveryStatus.Pending, item.Status);
        Assert.AreEqual(0, item.AttemptCount);
    }
    [TestMethod] public async Task SuccessPersistsProviderReferenceAndStableDeliveryId()
    {
        var provider = new FakeChannel(); var dispatcher = new NotificationDispatcher([provider]);
        var item = NotificationDelivery.ForAlert(Guid.NewGuid(), NotificationChannel.Webhook, "https://example.invalid", "Alarm", "Details", Now);
        await dispatcher.SendAsync(item, Now, default);
        Assert.AreEqual(NotificationDeliveryStatus.Sent, item.Status);
        Assert.AreEqual("provider-1", item.ProviderReference);
        Assert.AreEqual(item.Id.ToString(), provider.Last?.Attributes["deliveryId"]);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => item.Retry(Now));
    }
    [TestMethod] public void RecoveryEvidenceAndTargetsAreEnforcedBeforeStateChanges()
    {
        var drill = RecoveryDrill.Plan("backup", "isolated", 5, 30, "operator", Now); drill.Start(Now);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => drill.Complete(true, 1, 1, "", "ok", Now.AddMinutes(1)));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => drill.Complete(true, 6, 10, "evidence", "ok", Now.AddMinutes(1)));
        Assert.ThrowsExactly<DomainRuleViolationException>(() => drill.Complete(true, 1, 31, "evidence", "ok", Now.AddMinutes(1)));
        Assert.AreEqual(RecoveryDrillStatus.Running, drill.Status);
        drill.Complete(false, 6, 31, "evidence", "Target exceeded", Now.AddMinutes(31));
        Assert.AreEqual(RecoveryDrillStatus.Failed, drill.Status);
        Assert.ThrowsExactly<DomainRuleViolationException>(() => drill.Complete(true, 1, 1, "other", "ok", Now.AddMinutes(32)));
    }
    private sealed class FakeChannel : INotificationChannel
    {
        public NotificationChannel Channel => NotificationChannel.Webhook;
        public NotificationMessage? Last { get; private set; }
        public Task<NotificationSendResult> SendAsync(string target, NotificationMessage message, CancellationToken ct)
        { Last = message; return Task.FromResult(new NotificationSendResult(true, "provider-1", null)); }
    }
}
