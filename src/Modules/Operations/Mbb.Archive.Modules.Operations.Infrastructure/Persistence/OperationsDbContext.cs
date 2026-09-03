using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Operations.Application;
using Mbb.Archive.Modules.Operations.Domain.Recovery;
using Mbb.Archive.Modules.Operations.Domain.Verifications;
using Mbb.Archive.Modules.Operations.Domain.Alerts;
using Mbb.Archive.Modules.Operations.Domain.Notifications;
using Mbb.Archive.Modules.Operations.Domain.Storage;

namespace Mbb.Archive.Modules.Operations.Infrastructure.Persistence;

public sealed class OperationsDbContext :
    DbContext,
    IUnitOfWork<OperationsBoundary>
{
    public OperationsDbContext(
        DbContextOptions<OperationsDbContext> options)
        : base(options)
    {
    }

    internal DbSet<VerificationRun> VerificationRuns => Set<VerificationRun>();
    internal DbSet<RecoveryDrill> RecoveryDrills => Set<RecoveryDrill>();
    internal DbSet<AlertRule> AlertRules => Set<AlertRule>();
    internal DbSet<AlertInstance> AlertInstances => Set<AlertInstance>();
    internal DbSet<NotificationDelivery> NotificationDeliveries => Set<NotificationDelivery>();
    internal DbSet<StorageCapacitySnapshot> StorageCapacitySnapshots => Set<StorageCapacitySnapshot>();
    internal DbSet<StorageGrowthForecast> StorageForecasts => Set<StorageGrowthForecast>();
    internal DbSet<VerificationEvidencePackage> VerificationEvidence => Set<VerificationEvidencePackage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("operations");

        modelBuilder.Entity<VerificationRun>(entity =>
        {
            entity.ToTable("verification_runs", "operations");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.Kind).HasColumnName("kind").HasMaxLength(100);
            entity.Property(x => x.RequestedBy).HasColumnName("requested_by").HasMaxLength(300);
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.StartedAt).HasColumnName("started_at");
            entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
            entity.Property(x => x.CheckedItems).HasColumnName("checked_items");
            entity.Property(x => x.FailedItems).HasColumnName("failed_items");
            entity.Property(x => x.Summary).HasColumnName("summary").HasMaxLength(2000);
            entity.Property(x => x.ResultsJson).HasColumnName("results_json").HasColumnType("jsonb");
            entity.HasIndex(x => new { x.Kind, x.StartedAt });
            entity.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<RecoveryDrill>(entity =>
        {
            entity.ToTable("recovery_drills", "operations");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.BackupReference).HasColumnName("backup_reference").HasMaxLength(1000);
            entity.Property(x => x.TargetEnvironment).HasColumnName("target_environment").HasMaxLength(300);
            entity.Property(x => x.TargetRpoMinutes).HasColumnName("target_rpo_minutes");
            entity.Property(x => x.TargetRtoMinutes).HasColumnName("target_rto_minutes");
            entity.Property(x => x.RequestedBy).HasColumnName("requested_by").HasMaxLength(300);
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.PlannedAt).HasColumnName("planned_at");
            entity.Property(x => x.StartedAt).HasColumnName("started_at");
            entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
            entity.Property(x => x.ActualRpoMinutes).HasColumnName("actual_rpo_minutes");
            entity.Property(x => x.ActualRtoMinutes).HasColumnName("actual_rto_minutes");
            entity.Property(x => x.EvidenceReference).HasColumnName("evidence_reference").HasMaxLength(1000);
            entity.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(4000);
            entity.HasIndex(x => x.PlannedAt);
            entity.Ignore(x => x.DomainEvents);
        });

        ConfigureAlerts(modelBuilder);
        ConfigureNotifications(modelBuilder);
        ConfigureStorage(modelBuilder);
        ConfigureEvidence(modelBuilder);

        base.OnModelCreating(modelBuilder);
    }

    private static void ConfigureAlerts(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AlertRule>(entity =>
        {
            entity.ToTable("alert_rules", "operations"); entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.Code).HasColumnName("code").HasMaxLength(150); entity.HasIndex(x => x.Code).IsUnique();
            entity.Property(x => x.Metric).HasColumnName("metric").HasMaxLength(200);
            entity.Property(x => x.Comparison).HasColumnName("comparison").HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.Threshold).HasColumnName("threshold"); entity.Property(x => x.Severity).HasColumnName("severity").HasConversion<string>();
            entity.Property(x => x.EvaluationWindow).HasColumnName("evaluation_window"); entity.Property(x => x.IsEnabled).HasColumnName("is_enabled");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at"); entity.Property(x => x.UpdatedAt).HasColumnName("updated_at"); entity.Ignore(x => x.DomainEvents);
        });
        modelBuilder.Entity<AlertInstance>(entity =>
        {
            entity.ToTable("alert_instances", "operations"); entity.HasKey(x => x.Id); entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.RuleId).HasColumnName("rule_id"); entity.Property(x => x.DeduplicationKey).HasColumnName("deduplication_key").HasMaxLength(300);
            entity.HasIndex(x => new { x.RuleId, x.DeduplicationKey, x.Status }); entity.Property(x => x.Severity).HasColumnName("severity").HasConversion<string>();
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>(); entity.Property(x => x.CurrentValue).HasColumnName("current_value");
            entity.Property(x => x.OccurrenceCount).HasColumnName("occurrence_count"); entity.Property(x => x.OpenedAt).HasColumnName("opened_at");
            entity.Property(x => x.LastObservedAt).HasColumnName("last_observed_at"); entity.Property(x => x.ResolvedAt).HasColumnName("resolved_at");
            entity.OwnsOne(x => x.Acknowledgement, owned => { owned.Property(x => x.Subject).HasColumnName("acknowledged_by").HasMaxLength(300); owned.Property(x => x.Note).HasColumnName("acknowledgement_note").HasMaxLength(2000); owned.Property(x => x.AcknowledgedAt).HasColumnName("acknowledged_at"); });
            entity.OwnsMany(x => x.Escalations, owned => { owned.ToTable("alert_escalations", "operations"); owned.WithOwner().HasForeignKey("alert_instance_id"); owned.Property<Guid>("id"); owned.HasKey("id"); owned.Property(x => x.Target).HasColumnName("target").HasMaxLength(500); owned.Property(x => x.Severity).HasColumnName("severity").HasConversion<string>(); owned.Property(x => x.EscalatedAt).HasColumnName("escalated_at"); });
            entity.Ignore(x => x.DomainEvents);
        });
    }

    private static void ConfigureNotifications(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<NotificationDelivery>(entity =>
        {
            entity.ToTable("notification_deliveries", "operations"); entity.HasKey(x => x.Id); entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.Channel).HasColumnName("channel").HasConversion<string>(); entity.Property(x => x.Target).HasColumnName("target").HasMaxLength(1000);
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>(); entity.Property(x => x.AttemptCount).HasColumnName("attempt_count");
            entity.Property(x => x.LastError).HasColumnName("last_error").HasMaxLength(4000); entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.NextAttemptAt).HasColumnName("next_attempt_at"); entity.Property(x => x.SentAt).HasColumnName("sent_at"); entity.Ignore(x => x.DomainEvents);
        });
    }

    private static void ConfigureStorage(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<StorageCapacitySnapshot>(entity => { entity.ToTable("storage_capacity_snapshots", "operations"); entity.HasKey(x => x.Id); entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); entity.Property(x => x.OriginalBytes).HasColumnName("original_bytes"); entity.Property(x => x.ArtifactBytes).HasColumnName("artifact_bytes"); entity.Property(x => x.CapacityBytes).HasColumnName("capacity_bytes"); entity.Property(x => x.CapturedAt).HasColumnName("captured_at"); entity.Ignore(x => x.CurrentBytes); });
        modelBuilder.Entity<StorageGrowthForecast>(entity => { entity.ToTable("storage_forecasts", "operations"); entity.HasKey(x => x.Id); entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); entity.Property(x => x.CurrentBytes).HasColumnName("current_bytes"); entity.Property(x => x.CapacityBytes).HasColumnName("capacity_bytes"); entity.Property(x => x.UtilizationPercent).HasColumnName("utilization_percent"); entity.Property(x => x.DailyGrowthBytes).HasColumnName("daily_growth_bytes"); entity.Property(x => x.Forecast30Days).HasColumnName("forecast_30_days"); entity.Property(x => x.Forecast90Days).HasColumnName("forecast_90_days"); entity.Property(x => x.EstimatedDaysRemaining).HasColumnName("estimated_days_remaining"); entity.Property(x => x.GeneratedAt).HasColumnName("generated_at"); });
    }

    private static void ConfigureEvidence(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<VerificationEvidencePackage>(entity => { entity.ToTable("verification_evidence", "operations"); entity.HasKey(x => x.Id); entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); entity.Property(x => x.RunId).HasColumnName("run_id"); entity.Property(x => x.RunType).HasColumnName("run_type").HasMaxLength(100); entity.Property(x => x.StartedAt).HasColumnName("started_at"); entity.Property(x => x.CompletedAt).HasColumnName("completed_at"); entity.Property<string>("Result").HasColumnName("result").HasMaxLength(40); entity.Property(x => x.CheckedItems).HasColumnName("checked_items"); entity.Property(x => x.FailedItems).HasColumnName("failed_items"); entity.Property(x => x.ReportJson).HasColumnName("report_json").HasColumnType("jsonb"); entity.Property(x => x.Sha256).HasColumnName("sha256").HasMaxLength(64); entity.Property(x => x.GeneratedAt).HasColumnName("generated_at"); entity.Property(x => x.GeneratorVersion).HasColumnName("generator_version").HasMaxLength(100); });
    }
}
