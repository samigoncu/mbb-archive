using Mbb.Archive.Modules.Classification.Domain.Documents;
using Mbb.Archive.Modules.Classification.Domain.FilePlans;
using Mbb.Archive.Modules.Classification.Domain.Metadata;

namespace Mbb.Archive.Modules.Classification.Application.Abstractions;

public interface IClassificationRepository
{
    Task AddFilePlanAsync(FilePlan plan, CancellationToken cancellationToken);
    Task<FilePlan?> GetFilePlanAsync(FilePlanId id, CancellationToken cancellationToken);
    Task AddSchemaAsync(MetadataSchema schema, CancellationToken cancellationToken);
    Task<MetadataSchema?> GetSchemaAsync(MetadataSchemaId id, CancellationToken cancellationToken);
    Task AddClassificationAsync(DocumentClassification classification, CancellationToken cancellationToken);
    Task AddMetadataSetAsync(DocumentMetadataSet metadataSet, CancellationToken cancellationToken);
    Task<DocumentMetadataSet?> GetMetadataSetAsync(Guid documentId, MetadataSchemaId schemaId, CancellationToken cancellationToken);
    Task<bool> HasDocumentMetadataAsync(MetadataSchemaId schemaId, CancellationToken cancellationToken);
    void RemoveSchema(MetadataSchema schema);
}
