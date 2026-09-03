namespace Mbb.Archive.Modules.Archive.Domain.Records;
public readonly record struct ArchiveRecordId(Guid Value){public static ArchiveRecordId New()=>new(Guid.CreateVersion7());public override string ToString()=>Value.ToString();}
