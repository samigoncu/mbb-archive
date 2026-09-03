namespace Mbb.Archive.Modules.Processing.Domain.Jobs;

public readonly record struct ProcessingJobId(Guid Value)
{
    public static ProcessingJobId New() => new(Guid.CreateVersion7());

    public override string ToString() => Value.ToString();
}
