using Mbb.Archive.Modules.Processing.Application;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Processing.Application.Abstractions;
using Mbb.Archive.Modules.Processing.Application.Jobs.GetById;
using Mbb.Archive.Modules.Processing.Application.Jobs.Start;
using Mbb.Archive.Modules.Processing.Application.Jobs.Results;
using Mbb.Archive.Modules.Processing.Infrastructure.Messaging;
using Mbb.Archive.Modules.Processing.Infrastructure.Persistence;
using Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Outbox;

namespace Mbb.Archive.Modules.Processing.Infrastructure;

public static class ProcessingModule
{
    public static IServiceCollection AddProcessingModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("Processing");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Processing' is not configured.");

        services.AddDbContext<ProcessingDbContext>(
            options => options.UseNpgsql(connectionString));

        services
            .AddOptions<ProcessingResultConsumerOptions>()
            .Bind(configuration.GetSection(ProcessingResultConsumerOptions.SectionName))
            .Validate(options => !string.IsNullOrWhiteSpace(options.Queue), "Processing result queue is required.")
            .ValidateOnStart();

        services
            .AddOptions<SearchIndexedConsumerOptions>()
            .Bind(configuration.GetSection(SearchIndexedConsumerOptions.SectionName))
            .Validate(options => !string.IsNullOrWhiteSpace(options.Queue), "Processing search-indexed queue is required.")
            .ValidateOnStart();

        services
            .AddOptions<OriginalStoredConsumerOptions>()
            .Bind(configuration.GetSection(OriginalStoredConsumerOptions.SectionName))
            .Validate(options => !string.IsNullOrWhiteSpace(options.Queue), "Processing original-stored queue is required.")
            .ValidateOnStart();

        services
            .AddOptions<ProcessingOutboxOptions>()
            .Bind(configuration.GetSection(ProcessingOutboxOptions.SectionName))
            .Validate(options => options.BatchSize is > 0 and <= 500, "Processing Outbox batch size must be between 1 and 500.")
            .ValidateOnStart();

        services.Configure<Previews.PreviewArtifactOptions>(configuration.GetSection(Previews.PreviewArtifactOptions.SectionName));
        services.AddScoped<Mbb.Archive.Modules.Processing.Application.Previews.IPreviewArtifactStore, Previews.PreviewArtifactStore>();
        services.AddScoped<Mbb.Archive.Modules.Processing.Application.Previews.DocumentPreviewHandler>();
        services.AddScoped<Mbb.Archive.Modules.Processing.Application.Previews.DocumentVersionTextHandler>();
        services.AddScoped<IProcessingJobRepository, EfProcessingJobRepository>();
        services.AddScoped<Mbb.Archive.Modules.Processing.Contracts.IProcessedVersionArtifacts, ProcessedVersionArtifactsSource>();
        services.AddScoped<IProcessingQueries, EfProcessingQueries>();
        services.AddScoped<ProcessingOutboxStore>();

        services.AddScoped<IUnitOfWork<ProcessingBoundary>>(
            sp => sp.GetRequiredService<ProcessingDbContext>());

        services.AddScoped<IOutbox<ProcessingBoundary>>(
            sp => sp.GetRequiredService<ProcessingDbContext>());

        services.AddScoped<IInbox<ProcessingBoundary>>(
            sp => sp.GetRequiredService<ProcessingDbContext>());

        services.AddScoped<StartProcessingCommandHandler>();
        services.AddScoped<Mbb.Archive.Modules.Processing.Application.Jobs.Reprocess.ReprocessDocumentHandler>();
        services.AddScoped<ApplyPdfInspectionResultCommandHandler>();
        services.AddScoped<ApplyOcrResultCommandHandler>();
        services.AddScoped<ApplyTextExtractionResultCommandHandler>();
        services.AddScoped<FailProcessingCommandHandler>();
        services.AddScoped<GetProcessingJobByIdQueryHandler>();
        services.AddScoped<MarkSearchIndexedCommandHandler>();

        services.AddHostedService<OriginalStoredConsumerBackgroundService>();
        services.AddHostedService<ProcessingResultConsumerBackgroundService>();
        services.AddHostedService<ProcessingOutboxPublisher>();
        services.AddHostedService<SearchIndexedConsumerBackgroundService>();

        services.AddScoped<
            Mbb.Archive.BuildingBlocks.Observability.IOperationalSnapshotContributor,
            Mbb.Archive.Modules.Processing.Infrastructure.Operations.ProcessingOperationalSnapshotContributor>();

        return services;
    }
}
