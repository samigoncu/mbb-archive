using Mbb.Archive.Modules.Search.Application;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Search.Application.Abstractions;
using Mbb.Archive.Modules.Search.Application.Documents.Highlights;
using Mbb.Archive.Modules.Search.Application.Documents.Text;
using Mbb.Archive.Modules.Search.Application.Documents.Search;
using Mbb.Archive.Modules.Search.Application.Projection;
using Mbb.Archive.Modules.Search.Infrastructure.Artifacts;
using Mbb.Archive.Modules.Search.Infrastructure.Indexing;
using Mbb.Archive.Modules.Search.Infrastructure.Messaging;
using Mbb.Archive.Modules.Search.Infrastructure.OpenSearch;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence;
using Mbb.Archive.Modules.Search.Infrastructure.Persistence.Outbox;

namespace Mbb.Archive.Modules.Search.Infrastructure;

public static class SearchModule
{
    public static IServiceCollection AddSearchModule(this IServiceCollection services,IConfiguration configuration)
    {
        var connectionString=configuration.GetConnectionString("Search");if(string.IsNullOrWhiteSpace(connectionString))throw new InvalidOperationException("Connection string 'Search' is not configured.");
        services.AddDbContext<SearchDbContext>(options=>options.UseNpgsql(connectionString));
        services.AddOptions<OpenSearchOptions>().Bind(configuration.GetSection(OpenSearchOptions.SectionName)).Validate(x=>Uri.TryCreate(x.BaseUrl,UriKind.Absolute,out _),"Search OpenSearch BaseUrl must be absolute.").ValidateOnStart();
        services.AddOptions<SearchArtifactOptions>().Bind(configuration.GetSection(SearchArtifactOptions.SectionName)).ValidateOnStart();
        services.AddOptions<SearchIndexerOptions>().Bind(configuration.GetSection(SearchIndexerOptions.SectionName)).Validate(x=>x.BatchSize is >0 and <=200,"Search indexer batch size invalid.").ValidateOnStart();
        services.AddOptions<SearchProjectionConsumerOptions>().Bind(configuration.GetSection(SearchProjectionConsumerOptions.SectionName)).Validate(x=>!string.IsNullOrWhiteSpace(x.Queue),"Search projection queue required.").ValidateOnStart();
        services.AddOptions<SearchOutboxOptions>().Bind(configuration.GetSection(SearchOutboxOptions.SectionName)).ValidateOnStart();
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<ISearchDocumentRepository,EfSearchDocumentRepository>();
        services.AddScoped<ISearchProjectionQueries>(sp=>(EfSearchDocumentRepository)sp.GetRequiredService<ISearchDocumentRepository>());
        services.AddScoped<IUnitOfWork<SearchBoundary>>(sp=>sp.GetRequiredService<SearchDbContext>());services.AddScoped<IInbox<SearchBoundary>>(sp=>sp.GetRequiredService<SearchDbContext>());services.AddScoped<IOutbox<SearchBoundary>>(sp=>sp.GetRequiredService<SearchDbContext>());
        var provider=configuration[$"{SearchArtifactOptions.SectionName}:Provider"]??"Local";if(string.Equals(provider,"S3",StringComparison.OrdinalIgnoreCase))services.AddSingleton<ISearchArtifactStore,S3SearchArtifactStore>();else services.AddSingleton<ISearchArtifactStore,LocalSearchArtifactStore>();
        services.AddSingleton<IOcrHighlightReader,OcrHighlightReader>();services.AddSingleton<IDocumentTextReader,DocumentTextReader>();services.AddScoped<SearchIndexDocumentFactory>();
        services.AddHttpClient<OpenSearchHttpClient>();services.AddScoped<ISearchGateway,ActiveDocumentSearchGateway>();
        services.AddScoped<SearchProjectionHandler>();services.AddScoped<SearchDocumentsQueryHandler>();services.AddScoped<GetHighlightBoxesQueryHandler>();services.AddScoped<GetDocumentTextQueryHandler>();
        services.AddScoped<ICurrentVersionProjectionSource, CurrentVersionProjectionSource>();
        services.AddHostedService<SearchProjectionConsumerBackgroundService>();services.AddHostedService<SearchIndexerBackgroundService>();services.AddHostedService<SearchOutboxPublisher>();
        services.AddScoped<
            Mbb.Archive.BuildingBlocks.Observability.IOperationalSnapshotContributor,
            Mbb.Archive.Modules.Search.Infrastructure.Operations.SearchOperationalSnapshotContributor>();

        return services;
    }
}
