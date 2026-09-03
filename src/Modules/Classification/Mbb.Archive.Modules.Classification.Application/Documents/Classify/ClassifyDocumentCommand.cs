using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Classification.Application.Documents.Classify;
public sealed record ClassifyDocumentCommand(Guid DocumentId,Guid FilePlanId,Guid FilePlanItemId,bool IsPrimary) : ICommand<Guid>;
