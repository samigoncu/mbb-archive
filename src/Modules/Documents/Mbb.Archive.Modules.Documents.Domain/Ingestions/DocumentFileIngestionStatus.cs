namespace Mbb.Archive.Modules.Documents.Domain.Ingestions;

public enum DocumentFileIngestionStatus
{
    Created = 0,
    PendingSecurityScan = 1,
    SecurityApproved = 2,
    Rejected = 3,
    Accepted = 4,
    Failed = 5
}
