namespace Mbb.Archive.Modules.Classification.Domain.FilePlans;
public readonly record struct FilePlanItemId(Guid Value)
{
    public static FilePlanItemId New() => new(Guid.CreateVersion7());
}
