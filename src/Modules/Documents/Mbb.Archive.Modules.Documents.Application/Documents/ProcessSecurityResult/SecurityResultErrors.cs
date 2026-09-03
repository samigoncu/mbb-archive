using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.ProcessSecurityResult;

internal static class SecurityResultErrors
{
    public static readonly Error IngestionNotFound =
        Error.NotFound(
            "documents.ingestion_not_found",
            "Document file ingestion was not found.");

    public static readonly Error DocumentMismatch =
        Error.Conflict(
            "documents.ingestion_document_mismatch",
            "The security result does not belong to the ingestion document.");
}
