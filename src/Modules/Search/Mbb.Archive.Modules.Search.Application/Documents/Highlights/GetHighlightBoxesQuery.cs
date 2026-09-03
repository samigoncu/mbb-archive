using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Search.Application.Abstractions;

namespace Mbb.Archive.Modules.Search.Application.Documents.Highlights;

public sealed record GetHighlightBoxesQuery(
    Guid DocumentId,
    string Query,
    int? PageNumber) : IQuery<IReadOnlyList<HighlightBox>>;
