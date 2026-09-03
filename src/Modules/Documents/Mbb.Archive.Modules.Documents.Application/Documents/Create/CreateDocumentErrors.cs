using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.Create;

internal static class CreateDocumentErrors
{
    public static readonly Error TitleRequired =
        Error.Validation("documents.title_required", "Document title is required.");

    public static readonly Error TitleTooLong =
        Error.Validation("documents.title_too_long", "Document title cannot exceed 300 characters.");
}
