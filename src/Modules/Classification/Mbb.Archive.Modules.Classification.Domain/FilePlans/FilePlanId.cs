namespace Mbb.Archive.Modules.Classification.Domain.FilePlans;
public readonly record struct FilePlanId(Guid Value)
{
    public static FilePlanId New() => new(Guid.CreateVersion7());
}
