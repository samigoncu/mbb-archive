namespace Mbb.Archive.Modules.Retention.Domain.Disposition;

public sealed class DispositionReview
{
    private DispositionReview() { }
    public Guid Id { get; private set; }
    public Guid ProcessId { get; private set; }
    public string Actor { get; private set; } = "";
    public bool Approved { get; private set; }
    public string Reason { get; private set; } = "";
    public DateTimeOffset ReviewedAt { get; private set; }
    internal static DispositionReview Create(Guid processId, string actor, bool approved, string reason, DateTimeOffset at)
        => new() { Id = Guid.CreateVersion7(), ProcessId = processId, Actor = actor, Approved = approved, Reason = reason, ReviewedAt = at };
}
