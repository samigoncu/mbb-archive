using Mbb.Archive.Modules.Classification.Application.Metadata.List;
using Mbb.Archive.Modules.Classification.Application.FilePlans.List;
using Mbb.Archive.Modules.Classification.Application;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Classification.Application.Abstractions;
using Mbb.Archive.Modules.Classification.Application.Documents.Classify;
using Mbb.Archive.Modules.Classification.Application.Documents.Metadata;
using Mbb.Archive.Modules.Classification.Application.FilePlans.AddItem;
using Mbb.Archive.Modules.Classification.Application.FilePlans.Create;
using Mbb.Archive.Modules.Classification.Application.FilePlans.GetTree;
using Mbb.Archive.Modules.Classification.Application.Metadata.AddField;
using Mbb.Archive.Modules.Classification.Application.Metadata.Create;
using Mbb.Archive.Modules.Classification.Application.Metadata.GetSchema;
using Mbb.Archive.Modules.Classification.Application.Metadata.Publish;
using Mbb.Archive.Modules.Classification.Infrastructure.Persistence;
using Mbb.Archive.Modules.Classification.Infrastructure.Persistence.Outbox;

namespace Mbb.Archive.Modules.Classification.Infrastructure;

public static class ClassificationModule
{
    public static IServiceCollection AddClassificationModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Classification");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'Classification' is not configured.");
        }

        services.AddDbContext<ClassificationDbContext>(
            options => options.UseNpgsql(connectionString));

        services
            .AddOptions<ClassificationOutboxOptions>()
            .Bind(configuration.GetSection(ClassificationOutboxOptions.SectionName))
            .Validate(options => options.BatchSize is > 0 and <= 500, "Classification Outbox batch size must be between 1 and 500.")
            .ValidateOnStart();

        services.AddSingleton(TimeProvider.System);
        services.AddScoped<Mbb.Archive.Modules.Classification.Contracts.IFilePlanCatalog, FilePlanCatalog>();
        services.AddScoped<Mbb.Archive.Modules.Classification.Contracts.IFilePlanEntryCatalog, FilePlanEntryCatalog>();
        services.AddScoped<Mbb.Archive.Modules.Classification.Contracts.IDocumentClassificationFiling, DocumentClassificationFiling>();
        services.AddScoped<IClassificationRepository, EfClassificationRepository>();
        services.AddScoped<IClassificationQueries, EfClassificationQueries>();
        services.AddScoped<Mbb.Archive.Modules.Classification.Contracts.IClassificationExportReader, ClassificationExportReader>();
        services.AddScoped<IUnitOfWork<ClassificationBoundary>>(sp => sp.GetRequiredService<ClassificationDbContext>());
        services.AddScoped<IOutbox<ClassificationBoundary>>(sp => sp.GetRequiredService<ClassificationDbContext>());

        services.AddScoped<Mbb.Archive.Modules.Classification.Application.FilePlans.Retire.RetireFilePlanHandler>();
        services.AddScoped<CreateFilePlanCommandHandler>();
        services.AddScoped<AddFilePlanItemCommandHandler>();
        services.AddScoped<Mbb.Archive.Modules.Classification.Application.FilePlans.Manage.FilePlanManagementHandlers>();
        services.AddScoped<Mbb.Archive.Modules.Classification.Application.Metadata.Manage.MetadataSchemaManagementHandlers>();
        services.AddScoped<GetFilePlanTreeQueryHandler>();
        services.AddScoped<GetFilePlansQueryHandler>();
        services.AddScoped<GetMetadataSchemasQueryHandler>();
        services.AddScoped<CreateMetadataSchemaCommandHandler>();
        services.AddScoped<AddMetadataFieldCommandHandler>();
        services.AddScoped<PublishMetadataSchemaCommandHandler>();
        services.AddScoped<GetMetadataSchemaQueryHandler>();
        services.AddScoped<ClassifyDocumentCommandHandler>();
        services.AddScoped<SetDocumentMetadataCommandHandler>();

        services.AddHostedService<ClassificationOutboxPublisher>();
        return services;
    }
}
