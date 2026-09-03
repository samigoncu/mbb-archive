namespace Mbb.Archive.Modules.Documents.Domain.Ingestions;

public readonly record struct DocumentFileIngestionId(Guid Value)
{
    public static DocumentFileIngestionId New() => new(Guid.CreateVersion7());

    public override string ToString() => Value.ToString();
}
