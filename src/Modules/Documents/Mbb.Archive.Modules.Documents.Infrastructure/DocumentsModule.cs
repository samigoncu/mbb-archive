using Mbb.Archive.Modules.Documents.Application;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Documents.Application.Abstractions;
using Mbb.Archive.Modules.Documents.Application.Documents.Create;
using Mbb.Archive.Modules.Documents.Application.Documents.GetById;
using Mbb.Archive.Modules.Documents.Application.Documents.GetContent;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIngestion;
using Mbb.Archive.Modules.Documents.Application.Documents.GetIntegrity;
using Mbb.Archive.Modules.Documents.Application.Documents.GetVersions;
using Mbb.Archive.Modules.Documents.Application.Documents.List;
using Mbb.Archive.Modules.Documents.Application.Documents.ProcessSecurityResult;
using Mbb.Archive.Modules.Documents.Application.Documents.PromoteFile;
using Mbb.Archive.Modules.Documents.Application.Documents.StageFile;
using Mbb.Archive.Modules.Documents.Application.Operations.GetOutboxStatus;
using Mbb.Archive.Modules.Documents.Infrastructure.Health;
using Mbb.Archive.Modules.Documents.Infrastructure.Messaging;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence;
using Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Outbox;
using Mbb.Archive.Modules.Documents.Infrastructure.Storage;

namespace Mbb.Archive.Modules.Documents.Infrastructure;

public static class DocumentsModule
{
    public static IServiceCollection AddDocumentsModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("Documents");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'Documents' is not configured.");
        }

        services.AddDbContext<DocumentsDbContext>(
            options => options.UseNpgsql(connectionString));

        services
            .AddHealthChecks()
            .AddCheck<DocumentsDatabaseHealthCheck>(
                "documents-postgres",
                tags: ["ready"]);

        services.Configure<FileStagingOptions>(
            configuration.GetSection(FileStagingOptions.SectionName));

        services
            .AddOptions<OriginalStorageOptions>()
            .Bind(configuration.GetSection(OriginalStorageOptions.SectionName))
            .ValidateOnStart();

        services
            .AddOptions<PromotionConsumerOptions>()
            .Bind(configuration.GetSection(PromotionConsumerOptions.SectionName))
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.Queue),
                "Documents promotion consumer queue is required.")
            .ValidateOnStart();

        services
            .AddOptions<ClassificationConsumerOptions>()
            .Bind(configuration.GetSection(ClassificationConsumerOptions.SectionName));

        services
            .AddOptions<SecurityResultConsumerOptions>()
            .Bind(configuration.GetSection(SecurityResultConsumerOptions.SectionName))
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.Queue),
                "Documents security-result consumer queue is required.")
            .ValidateOnStart();

        services
            .AddOptions<OutboxPublisherOptions>()
            .Bind(configuration.GetSection(OutboxPublisherOptions.SectionName))
            .Validate(
                options => options.BatchSize is > 0 and <= 500,
                "Outbox batch size must be between 1 and 500.")
            .Validate(
                options => options.MaxAttempts > 0,
                "Outbox max attempts must be greater than zero.")
            .ValidateOnStart();

        services
            .AddOptions<Mbb.Archive.Modules.Documents.Infrastructure.Operations.DocumentsFixityOptions>()
            .Bind(configuration.GetSection(
                Mbb.Archive.Modules.Documents.Infrastructure.Operations.DocumentsFixityOptions.SectionName))
            .Validate(
                options => options.SampleSize is > 0 and <= 500,
                "Documents fixity sample size must be between 1 and 500.")
            .ValidateOnStart();

        services.AddSingleton(TimeProvider.System);

        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Dossiers.IDossierRepository, EfDossiers>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Dossiers.IDossierQueries, EfDossiers>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Contracts.IArchiveFilingCatalog, EfDossiers>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Dossiers.DossierHandlers>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Dossiers.DocumentFilingHandler>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Dossiers.IDocumentFilingTransaction, DocumentFilingTransaction>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Settings.IUploadPolicyStore, UploadPolicyStore>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Settings.UploadPolicyHandler>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Settings.IStorageStatusQuery,
            Storage.StorageStatusQuery>();
        services.AddScoped<IDocumentRepository, EfDocumentRepository>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Relations.IDocumentRelations, DocumentRelations>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Relations.DocumentRelationsHandler>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Contracts.ICurrentDocumentVersion, CurrentDocumentVersionSource>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Documents.CancelVersion.CancelDocumentVersionHandler>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Contracts.IDocumentSearchDatesProvider, DocumentSearchDatesProvider>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Contracts.IDocumentSearchExclusions, DocumentSearchExclusions>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Application.Documents.Cancel.DocumentCancellationHandler>();
        services.AddScoped<IDocumentIngestionRepository, EfDocumentIngestionRepository>();
        services.AddScoped<IDocumentQueries, EfDocumentQueries>();
        services.AddScoped<IFileStagingService, LocalFileStagingService>();
        services.AddScoped<Mbb.Archive.Modules.Documents.Contracts.IOriginalProtectionSynchronizer, OriginalProtectionSynchronizer>();

        var originalStorageProvider =
            configuration[$"{OriginalStorageOptions.SectionName}:Provider"]
            ?? "Local";

        if (string.Equals(originalStorageProvider, "S3", StringComparison.OrdinalIgnoreCase))
            services.AddSingleton<IOriginalObjectStorage, S3OriginalObjectStorage>();
        else
            services.AddSingleton<IOriginalObjectStorage, LocalOriginalObjectStorage>();

        services.AddScoped<IOutboxStore, PostgresOutboxStore>();
        services.AddScoped<IOutboxQueries, EfOutboxQueries>();

        // Aynı scoped DbContext hem transaction boundary hem transactional outbox buffer'ıdır.
        services.AddScoped<IUnitOfWork<DocumentsBoundary>>(
            sp => sp.GetRequiredService<DocumentsDbContext>());

        services.AddScoped<IOutbox<DocumentsBoundary>>(
            sp => sp.GetRequiredService<DocumentsDbContext>());

        services.AddScoped<IInbox<DocumentsBoundary>>(
            sp => sp.GetRequiredService<DocumentsDbContext>());

        services.AddScoped<CreateDocumentCommandHandler>();
        services.AddScoped<GetDocumentByIdQueryHandler>();
        services.AddScoped<GetDocumentContentQueryHandler>();
        services.AddScoped<GetDocumentIngestionQueryHandler>();
        services.AddScoped<GetDocumentsQueryHandler>();
        services.AddScoped<GetDocumentIntegrityQueryHandler>();
        services.AddScoped<GetDocumentVersionsQueryHandler>();
        services.AddScoped<StageDocumentFileCommandHandler>();
        services.AddScoped<GetOutboxStatusQueryHandler>();
        services.AddScoped<ApproveDocumentFileSecurityCommandHandler>();
        services.AddScoped<RejectDocumentFileSecurityCommandHandler>();
        services.AddScoped<PromoteDocumentFileCommandHandler>();

        services.AddHostedService<OutboxPublisherBackgroundService>();
        services.AddScoped<Mbb.Archive.BuildingBlocks.Application.Security.IDocumentVisibility, DocumentVisibility>();

        services.AddHostedService<SecurityResultConsumerBackgroundService>();
        services.AddHostedService<ClassificationConsumerBackgroundService>();
        services.AddHostedService<PromotionConsumerBackgroundService>();

        services.AddScoped<
            Mbb.Archive.BuildingBlocks.Observability.IOperationalSnapshotContributor,
            Mbb.Archive.Modules.Documents.Infrastructure.Operations.DocumentsOperationalSnapshotContributor>();

        services.AddScoped<
            Mbb.Archive.BuildingBlocks.Observability.IIntegrityVerificationContributor,
            Mbb.Archive.Modules.Documents.Infrastructure.Operations.DocumentsOriginalFixityVerifier>();

        services.AddScoped<Mbb.Archive.BuildingBlocks.Application.Security.IOrganizationUnitUsage, DocumentUnitUsage>();
        services.AddScoped<Mbb.Archive.BuildingBlocks.Application.Security.IFilePlanCodeUsage, DocumentFilePlanUsage>();
        return services;
    }
}
