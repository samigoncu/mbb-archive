using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.StageFile;

public static class StageDocumentFileErrors
{
    public static readonly Error DocumentNotFound =
        Error.NotFound("documents.not_found", "Document was not found.");

    public static readonly Error FileNameRequired =
        Error.Validation("documents.file_name_required", "X-File-Name header is required.");

    public static readonly Error InvalidSize =
        Error.Validation("documents.invalid_file_size", "File size must be greater than zero.");

    public static Error DomainConflict(string description)
        => Error.Conflict("documents.file_ingestion_conflict", description);
}
