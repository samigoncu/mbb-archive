using Microsoft.AspNetCore.Http;
using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.BuildingBlocks.Presentation;

public static class ApiResults
{
    public static IResult Problem(Error error)
    {
        var statusCode = error.Type switch
        {
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status500InternalServerError
        };

        return Results.Problem(
            statusCode: statusCode,
            title: GetTitle(error.Type),
            detail: error.Description,
            extensions: new Dictionary<string, object?>
            {
                ["code"] = error.Code
            });
    }

    private static string GetTitle(ErrorType type)
        => type switch
        {
            ErrorType.Validation => "Validation failed",
            ErrorType.NotFound => "Resource not found",
            ErrorType.Conflict => "Business rule conflict",
            ErrorType.Unauthorized => "Authentication required",
            ErrorType.Forbidden => "Access denied",
            _ => "Request failed"
        };
}
