namespace Mbb.Archive.Modules.Documents.Domain.Settings;

public sealed class UploadPolicy
{
    public int Id { get; private set; } = 1;
    public int MaxFileSizeMb { get; private set; } = 200;
    public long Version { get; private set; } = 1;
    public string UpdatedBy { get; private set; } = "system";
    public DateTimeOffset? UpdatedAt { get; private set; }

    public void Change(int sizeMb, string actor, DateTimeOffset now)
    {
        if (sizeMb is < 1 or > 2048) throw new ArgumentOutOfRangeException(nameof(sizeMb));
        MaxFileSizeMb = sizeMb;
        UpdatedBy = actor;
        UpdatedAt = now;
        Version++;
    }
}
