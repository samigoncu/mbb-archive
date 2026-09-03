using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Operations.Application.Commands;

public sealed record RunIntegrityVerificationCommand(
    string RequestedBy) : ICommand<Guid>;

public sealed record PlanRecoveryDrillCommand(
    string BackupReference,
    string TargetEnvironment,
    int TargetRpoMinutes,
    int TargetRtoMinutes,
    string RequestedBy) : ICommand<Guid>;

public sealed record StartRecoveryDrillCommand(
    Guid DrillId) : ICommand;

public sealed record CompleteRecoveryDrillCommand(
    Guid DrillId,
    bool Passed,
    int ActualRpoMinutes,
    int ActualRtoMinutes,
    string EvidenceReference,
    string Notes) : ICommand;
