using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Domain.Metadata;

namespace Mbb.Archive.Modules.Classification.Application.Metadata.Manage;

public sealed record RenameMetadataSchemaCommand(Guid SchemaId, string Name) : ICommand;

public sealed record UpdateMetadataFieldCommand(
    Guid SchemaId, Guid FieldId, string Label, string FieldType,
    bool IsRequired, bool IsSearchable, bool IsRepeatable, string? OptionsJson) : ICommand;

public sealed record RemoveMetadataFieldCommand(Guid SchemaId, Guid FieldId) : ICommand;

public sealed record DeleteMetadataSchemaCommand(Guid SchemaId) : ICommand;

public sealed record RevertMetadataSchemaToDraftCommand(Guid SchemaId) : ICommand;

/// <summary>
/// Üstveri şeması düzeltmeleri.
/// </summary>
/// <remarks>
/// Kurumsal hibrit model: Yayımlanmış şemalarda geriye dönük uyumlu değişiklikler
/// (alan ekleme, etiket/seçenek düzeltme) serbesttir. Kırıcı değişiklikler ve
/// henüz belgeye bağlanmamış şemaların taslağa geri alınması güvenli şekilde denetlenir.
/// </remarks>
public sealed class MetadataSchemaManagementHandlers(
    IClassificationRepository repository,
    IUnitOfWork<ClassificationBoundary> unitOfWork)
{
    public async Task<Result> Handle(RenameMetadataSchemaCommand command, CancellationToken ct)
        => await Apply(command.SchemaId, requireDraft: false, schema => schema.Rename(command.Name), ct);

    public async Task<Result> Handle(UpdateMetadataFieldCommand command, CancellationToken ct)
    {
        if (!Enum.TryParse<MetadataFieldType>(command.FieldType, ignoreCase: true, out var fieldType))
            return Result.Failure(Error.Validation("classification.metadata_field_type_invalid", "Geçersiz alan türü."));

        return await Apply(command.SchemaId, requireDraft: false, schema => schema.UpdateField(
            command.FieldId, command.Label, fieldType, command.IsRequired,
            command.IsSearchable, command.IsRepeatable, command.OptionsJson), ct);
    }

    public async Task<Result> Handle(RemoveMetadataFieldCommand command, CancellationToken ct)
    {
        var schema = await repository.GetSchemaAsync(new MetadataSchemaId(command.SchemaId), ct);
        if (schema is null)
            return Result.Failure(Error.NotFound("classification.metadata_schema_not_found", "Üstveri şeması bulunamadı."));

        if (schema.Status == MetadataSchemaStatus.Published)
        {
            if (await repository.HasDocumentMetadataAsync(schema.Id, ct))
                return Result.Failure(Error.Conflict("classification.metadata_schema_in_use",
                    "Bu şema ile kaydedilmiş belgeler bulunmaktadır. Alan silinemez; değişiklik için yeni sürüm oluşturun."));

            schema.RevertToDraft();
        }

        try { schema.RemoveField(command.FieldId); }
        catch (DomainRuleViolationException exception)
        {
            return Result.Failure(Error.Validation("classification.metadata_schema_invalid", exception.Message));
        }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> Handle(DeleteMetadataSchemaCommand command, CancellationToken ct)
    {
        var schema = await repository.GetSchemaAsync(new MetadataSchemaId(command.SchemaId), ct);
        if (schema is null)
            return Result.Failure(Error.NotFound("classification.metadata_schema_not_found", "Üstveri şeması bulunamadı."));

        if (schema.Status != MetadataSchemaStatus.Draft)
        {
            if (await repository.HasDocumentMetadataAsync(schema.Id, ct))
                return Result.Failure(Error.Conflict("classification.metadata_schema_published",
                    "Belgelerde kullanılan yayımlanmış üstveri şeması silinemez."));
        }

        repository.RemoveSchema(schema);
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> Handle(RevertMetadataSchemaToDraftCommand command, CancellationToken ct)
    {
        var schema = await repository.GetSchemaAsync(new MetadataSchemaId(command.SchemaId), ct);
        if (schema is null)
            return Result.Failure(Error.NotFound("classification.metadata_schema_not_found", "Üstveri şeması bulunamadı."));

        if (schema.Status != MetadataSchemaStatus.Published)
            return Result.Failure(Error.Conflict("classification.metadata_schema_not_published", "Şema zaten taslak durumundadır."));

        if (await repository.HasDocumentMetadataAsync(schema.Id, ct))
            return Result.Failure(Error.Conflict("classification.metadata_schema_in_use",
                "Bu şema ile arşivlenmiş belgeler bulunmaktadır. Belge bütünlüğünü korumak için taslağa geri alınamaz; güvenli alan düzenlemelerini kullanabilir veya yeni sürüm açabilirsiniz."));

        schema.RevertToDraft();
        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }

    private async Task<Result> Apply(Guid schemaId, bool requireDraft, Action<MetadataSchema> change, CancellationToken ct)
    {
        var schema = await repository.GetSchemaAsync(new MetadataSchemaId(schemaId), ct);
        if (schema is null)
            return Result.Failure(Error.NotFound("classification.metadata_schema_not_found", "Üstveri şeması bulunamadı."));

        // Yayımlanmış şemaya müdahale bir doğrulama hatası değil, durum
        // çakışmasıdır; kullanıcıya yeni sürüm açması söylenir.
        if (requireDraft && schema.Status != MetadataSchemaStatus.Draft)
            return Result.Failure(Error.Conflict("classification.metadata_schema_published",
                "Yayımlanmış şemanın alanları değiştirilemez. Değişiklik için yeni bir sürüm oluşturun."));

        try { change(schema); }
        catch (DomainRuleViolationException exception)
        {
            return Result.Failure(Error.Validation("classification.metadata_schema_invalid", exception.Message));
        }

        await unitOfWork.SaveChangesAsync(ct);
        return Result.Success();
    }
}
