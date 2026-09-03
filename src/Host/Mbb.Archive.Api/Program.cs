using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Mbb.Archive.BuildingBlocks.Observability;
using Mbb.Archive.Modules.Operations.Infrastructure;
using Mbb.Archive.Modules.Operations.Presentation;
using Mbb.Archive.Modules.PhysicalArchive.Infrastructure;
using Mbb.Archive.Modules.PhysicalArchive.Presentation;
using Mbb.Archive.Modules.Evidence.Infrastructure;
using Mbb.Archive.Modules.Evidence.Presentation;
using Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure;
using Mbb.Archive.Modules.OfficialCorrespondence.Presentation;
using Mbb.Archive.Modules.Workflow.Presentation;
using Mbb.Archive.Modules.Workflow.Infrastructure;
using Mbb.Archive.Modules.Audit.Presentation;
using Mbb.Archive.Modules.Audit.Infrastructure;
using Mbb.Archive.Modules.Retention.Presentation;
using Mbb.Archive.Modules.Retention.Infrastructure;
using Mbb.Archive.Modules.Archive.Presentation;
using Mbb.Archive.Modules.Archive.Infrastructure;
using Mbb.Archive.Modules.AccessControl.Presentation;
using Mbb.Archive.Modules.AccessControl.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Mbb.Archive.Api.Infrastructure;
using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;
using Mbb.Archive.Modules.Documents.Infrastructure;
using Mbb.Archive.Modules.Classification.Infrastructure;
using Mbb.Archive.Modules.Classification.Presentation;
using Mbb.Archive.Modules.Documents.Presentation;
using Mbb.Archive.Modules.Processing.Infrastructure;
using Mbb.Archive.Modules.Processing.Presentation;
using Mbb.Archive.Modules.Search.Infrastructure;
using Mbb.Archive.Modules.Search.Presentation;

var builder = WebApplication.CreateBuilder(args);

// Enum'lar API sözleşmesinde isimle taşınır; web tarafı string union bekler.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();

builder.Services
    .AddHealthChecks()
    .AddCheck(
        "self",
        () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy(),
        tags: ["live"]);

builder.Services.AddOpenApi();

builder.Services
    .AddOpenTelemetry()
    .ConfigureResource(resource =>
        resource.AddService(
            serviceName: ArchiveTelemetry.ServiceName,
            serviceVersion: "1.4.0"))
    .WithTracing(tracing =>
        tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddSource(ArchiveTelemetry.ActivitySourceName)
            .AddOtlpExporter())
    .WithMetrics(metrics =>
        metrics
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation()
            .AddMeter(ArchiveTelemetry.MeterName)
            .AddMeter("Mbb.Archive.Operations")
            .AddOtlpExporter());

builder.Services.AddCors(
    options =>
    {
        options.AddPolicy(
            "WebApp",
            policy =>
            {
                var origins = builder.Configuration
                    .GetSection("Cors:AllowedOrigins")
                    .Get<string[]>()
                    ?? ["http://localhost:3000"];

                policy
                    .WithOrigins(origins)
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
    });

builder.Services.AddRateLimiter(
    options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.AddPolicy(
            "uploads",
            httpContext =>
            {
                var key =
                    httpContext.Connection.RemoteIpAddress?.ToString()
                    ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter(
                    key,
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 20,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                        AutoReplenishment = true
                    });
            });
    });

builder.Services
    .AddOptions<ArchiveAuthenticationOptions>()
    .Bind(builder.Configuration.GetSection(ArchiveAuthenticationOptions.SectionName))
    .ValidateOnStart();

var authenticationOptions =
    builder.Configuration.GetSection(ArchiveAuthenticationOptions.SectionName)
        .Get<ArchiveAuthenticationOptions>() ?? new ArchiveAuthenticationOptions();

if (authenticationOptions.Enabled)
{
    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = authenticationOptions.Authority;
            options.Audience = authenticationOptions.Audience;
            options.RequireHttpsMetadata = authenticationOptions.RequireHttpsMetadata;
        });
}
else
{
    builder.Services.AddAuthentication("Development")
        .AddScheme<AuthenticationSchemeOptions, DevelopmentAuthenticationHandler>(
            "Development", _ => { });
}

builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

builder.Services.AddRabbitMqMessaging(builder.Configuration);
builder.Services.AddDocumentsModule(builder.Configuration);
builder.Services.AddClassificationModule(builder.Configuration);
builder.Services.AddProcessingModule(builder.Configuration);
builder.Services.AddSearchModule(builder.Configuration);
builder.Services.AddAccessControlModule(builder.Configuration);
builder.Services.AddArchiveModule(builder.Configuration);
builder.Services.AddRetentionModule(builder.Configuration);
builder.Services.AddAuditModule(builder.Configuration);
builder.Services.AddWorkflowModule(builder.Configuration);
builder.Services.AddPhysicalArchiveModule(builder.Configuration);
builder.Services.AddEvidenceModule(builder.Configuration);
builder.Services.AddOfficialCorrespondenceModule(builder.Configuration);
builder.Services.AddOperationsModule(builder.Configuration);

var app = builder.Build();

DeploymentGuard.EnsureFoundationIsNotExposedUnauthenticated(app);

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();

if (!app.Environment.IsDevelopment())
    app.UseHsts();

app.UseCors("WebApp");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapHealthChecks(
    "/health/live",
    new HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("live")
    });

app.MapHealthChecks(
    "/health/ready",
    new HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("ready")
    });

app.MapOpenApi();
app.MapDocumentsEndpoints();
app.MapClassificationEndpoints();
app.MapProcessingEndpoints();
app.MapSearchEndpoints();
app.MapAccessEndpoints();
app.MapArchiveEndpoints();
app.MapRetentionEndpoints();
app.MapAuditEndpoints();
app.MapWorkflowEndpoints();
app.MapPhysicalArchiveEndpoints();
app.MapEvidenceEndpoints();
app.MapOfficialCorrespondenceEndpoints();
app.MapOperationsEndpoints();
app.MapCurrentUser();

app.Run();
