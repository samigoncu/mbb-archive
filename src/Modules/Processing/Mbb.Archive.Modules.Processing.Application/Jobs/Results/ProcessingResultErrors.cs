using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Processing.Application.Jobs.Results;
internal static class ProcessingResultErrors
{
    public static readonly Error JobNotFound = Error.NotFound("processing.job_not_found", "Processing job was not found.");
    public static Error Conflict(string detail) => Error.Conflict("processing.result_conflict", detail);
}
