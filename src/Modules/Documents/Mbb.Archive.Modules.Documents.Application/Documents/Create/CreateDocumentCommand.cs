using Mbb.Archive.BuildingBlocks.Application;

namespace Mbb.Archive.Modules.Documents.Application.Documents.Create;

public sealed record CreateDocumentCommand(string Title) : ICommand<CreateDocumentResponse>;

public sealed record CreateDocumentResponse(Guid Id, string Title);
