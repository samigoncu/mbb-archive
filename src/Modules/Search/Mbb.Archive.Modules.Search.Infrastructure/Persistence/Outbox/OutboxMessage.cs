namespace Mbb.Archive.Modules.Search.Infrastructure.Persistence.Outbox;
internal sealed class OutboxMessage
{
    private OutboxMessage() { }
    internal OutboxMessage(Guid id,string eventName,string payload,DateTimeOffset occurredAt)
    {Id=id;EventName=eventName;Payload=payload;OccurredAt=occurredAt;NextAttemptAt=occurredAt;}
    public Guid Id{get;private set;} public string EventName{get;private set;}=string.Empty;
    public string Payload{get;private set;}=string.Empty; public DateTimeOffset OccurredAt{get;private set;}
    public DateTimeOffset NextAttemptAt{get;private set;} public DateTimeOffset? ProcessedAt{get;private set;}
    public DateTimeOffset? DeadLetteredAt{get;private set;} public int AttemptCount{get;private set;}
    public string? LastError{get;private set;} public string? LockedBy{get;private set;} public DateTimeOffset? LockedUntil{get;private set;}
    internal void Lease(string workerId,DateTimeOffset until){LockedBy=workerId;LockedUntil=until;}
    internal void Published(string workerId,DateTimeOffset now){Ensure(workerId);ProcessedAt=now;LockedBy=null;LockedUntil=null;LastError=null;}
    internal void Failed(string workerId,string error,DateTimeOffset now,DateTimeOffset next,int max){Ensure(workerId);AttemptCount++;LastError=error.Length<=4000?error:error[..4000];LockedBy=null;LockedUntil=null;if(AttemptCount>=max)DeadLetteredAt=now;else NextAttemptAt=next;}
    private void Ensure(string workerId){if(!string.Equals(LockedBy,workerId,StringComparison.Ordinal))throw new InvalidOperationException("Search Outbox lease owner mismatch.");}
}
