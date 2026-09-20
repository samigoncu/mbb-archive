using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Operations.Domain.Recovery;

public enum RecoveryDrillStatus
{
    Planned = 0,
    Running = 1,
    Passed = 2,
    Failed = 3
}

public sealed class RecoveryDrill : AggregateRoot<Guid>
{
    private RecoveryDrill()
    {
    }

    private RecoveryDrill(
        Guid id,
        string backupReference,
        string targetEnvironment,
        int targetRpoMinutes,
        int targetRtoMinutes,
        string requestedBy,
        DateTimeOffset plannedAt)
        : base(id)
    {
        if (string.IsNullOrWhiteSpace(backupReference))
            throw new DomainRuleViolationException("Backup reference is required.");

        if (string.IsNullOrWhiteSpace(targetEnvironment))
            throw new DomainRuleViolationException("Recovery target environment is required.");

        if (targetRpoMinutes <= 0 || targetRtoMinutes <= 0)
            throw new DomainRuleViolationException("RPO and RTO targets must be positive.");

        if (backupReference.Length > 1000 || targetEnvironment.Length > 300 || string.IsNullOrWhiteSpace(requestedBy) || requestedBy.Length > 300)
            throw new DomainRuleViolationException("Yedek, ortam veya işlemi yapan kullanıcı bilgisi geçersiz.");
        BackupReference = backupReference.Trim();
        TargetEnvironment = targetEnvironment.Trim();
        TargetRpoMinutes = targetRpoMinutes;
        TargetRtoMinutes = targetRtoMinutes;
        RequestedBy = requestedBy.Trim();
        PlannedAt = plannedAt;
        Status = RecoveryDrillStatus.Planned;
    }

    public string BackupReference { get; private set; } = string.Empty;
    public string TargetEnvironment { get; private set; } = string.Empty;
    public int TargetRpoMinutes { get; private set; }
    public int TargetRtoMinutes { get; private set; }
    public string RequestedBy { get; private set; } = string.Empty;
    public RecoveryDrillStatus Status { get; private set; }
    public DateTimeOffset PlannedAt { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public int? ActualRpoMinutes { get; private set; }
    public int? ActualRtoMinutes { get; private set; }
    public string EvidenceReference { get; private set; } = string.Empty;
    public string Notes { get; private set; } = string.Empty;

    public static RecoveryDrill Plan(
        string backupReference,
        string targetEnvironment,
        int targetRpoMinutes,
        int targetRtoMinutes,
        string requestedBy,
        DateTimeOffset now)
        => new(
            Guid.CreateVersion7(),
            backupReference,
            targetEnvironment,
            targetRpoMinutes,
            targetRtoMinutes,
            requestedBy,
            now);

    public void Start(DateTimeOffset now)
    {
        if (Status != RecoveryDrillStatus.Planned)
            throw new DomainRuleViolationException("Only a planned recovery drill can start.");

        Status = RecoveryDrillStatus.Running;
        StartedAt = now;
    }

    public void Complete(
        bool passed,
        int actualRpoMinutes,
        int actualRtoMinutes,
        string evidenceReference,
        string notes,
        DateTimeOffset now)
    {
        if (Status != RecoveryDrillStatus.Running)
            throw new DomainRuleViolationException("Recovery drill must be running.");

        if (actualRpoMinutes < 0 || actualRtoMinutes < 0)
            throw new DomainRuleViolationException("Actual RPO/RTO values cannot be negative.");

        if (string.IsNullOrWhiteSpace(evidenceReference) || evidenceReference.Length > 1000)
            throw new DomainRuleViolationException("Tatbikat kanıt referansı zorunludur (en fazla 1000 karakter).");
        if (string.IsNullOrWhiteSpace(notes) || notes.Length > 4000)
            throw new DomainRuleViolationException("Geri yükleme ve doğrulama sonuçlarını açıklayın (en fazla 4000 karakter).");
        if (passed && (actualRpoMinutes > TargetRpoMinutes || actualRtoMinutes > TargetRtoMinutes))
            throw new DomainRuleViolationException("RPO veya RTO hedefi aşılmış tatbikat başarılı olarak kaydedilemez.");
        if (now < StartedAt)
            throw new DomainRuleViolationException("Tatbikat bitişi başlangıçtan önce olamaz.");

        Status = passed
            ? RecoveryDrillStatus.Passed
            : RecoveryDrillStatus.Failed;

        ActualRpoMinutes = actualRpoMinutes;
        ActualRtoMinutes = actualRtoMinutes;
        EvidenceReference = evidenceReference?.Trim() ?? string.Empty;
        Notes = notes?.Trim() ?? string.Empty;
        CompletedAt = now;
    }
}
