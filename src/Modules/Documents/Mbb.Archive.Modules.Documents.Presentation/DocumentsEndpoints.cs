using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.Modules.Documents.Presentation.Endpoints;

namespace Mbb.Archive.Modules.Documents.Presentation;

public static class DocumentsEndpoints
{
    public static IEndpointRouteBuilder MapDocumentsEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/v1/documents")
            .WithTags("Documents")
            .RequireAuthorization();

        group.MapCreateDocument();
        group.MapGetDocuments();
        group.MapGetDocumentById();
        group.MapGetDocumentContent();
        group.MapGetDocumentIngestion();
        group.MapStageDocumentFile();
        group.MapGetOutboxStatus();

        return endpoints;
    }
}
