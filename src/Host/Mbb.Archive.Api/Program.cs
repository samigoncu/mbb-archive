using Mbb.Archive.Modules.Organization.Infrastructure;
using Mbb.Archive.Modules.Organization.Presentation;
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
using Mbb.Archive.Modules.Collections.Infrastructure;
using Mbb.Archive.Modules.Collections.Presentation;
using Mbb.Archive.Modules.Geo.Infrastructure;
using Mbb.Archive.Modules.Geo.Presentation;
using Mbb.Archive.Modules.AccessControl.Presentation;
using Mbb.Archive.Modules.AccessControl.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.RateLimiting;
using Mbb.Archive.Api.Infrastructure;
using Mbb.Archive.Api.Infrastructure.Auditing;
using Mbb.Archive.BuildingBlocks.Application.Auditing;
using Mbb.Archive.BuildingBlocks.Application.Security;
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
Mbb.Archive.Hosting.LocalStoragePaths.Configure(builder.Configuration, builder.Environment);

// Enum'lar API sözleşmesinde isimle taşınır; web tarafı string union bekler.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();

builder.Services.AddHttpClient("readiness");

builder.Services
    .AddHealthChecks()
    .AddCheck(
        "self",
        () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy(),
        tags: ["live"])
    .AddCheck<RabbitMqReadinessCheck>(
        "rabbitmq",
        tags: ["ready"])
    .AddCheck<ObjectStorageReadinessCheck>(
        "object-storage",
        tags: ["ready"])
    .AddCheck<OpenSearchReadinessCheck>(
        "opensearch",
        tags: ["ready"]);

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

        // Dizin sorgusu tetikleyen uçlar: her çağrı LDAP sunucusuna gider,
        // bu yüzden kullanıcı başına sınırlanır. Anahtar kimliktir, IP değil:
        // aynı ofisten çıkan onlarca kullanıcı birbirini engellememeli.
        options.AddPolicy(
            "directory",
            httpContext =>
            {
                var key = httpContext.User.Identity?.Name
                    ?? httpContext.Connection.RemoteIpAddress?.ToString()
                    ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter(
                    key,
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                        AutoReplenishment = true
                    });
            });

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

// CBS ve LDAP servis parolaları Data Protection ile şifrelenir.
//
// Anahtar halkası kalıcı bir dizinde tutulmalıdır: varsayılan davranışta
// anahtarlar konteynerin yazılabilir katmanına düşer ve kap yeniden
// oluşturulduğunda kaybolur — o noktada şifreli parolalar bir daha çözülemez.
// Bu yüzden üretimde yol zorunludur; eksikse uygulama açılışta durur, çünkü
// sırların sessizce çözülemez hâle gelmesi ancak aylar sonra fark edilirdi.
var keyRingPath = builder.Configuration["DataProtection:KeyRingPath"];
var dataProtection = builder.Services.AddDataProtection()
    // Uygulama adı sabitlenmezse içerik kökü değiştiğinde anahtarlar
    // farklı bir amaç zincirine düşer ve eski şifreli değerler açılamaz.
    .SetApplicationName("Mbb.Archive");

string? resolvedKeyRingPath = null;

if (!string.IsNullOrWhiteSpace(keyRingPath))
{
    // Yol LocalStoragePaths tarafından çözülmüş olarak gelir: diğer yerel
    // depolama kökleriyle aynı kural geçerlidir, çalışma dizini etkilemez.
    resolvedKeyRingPath = keyRingPath;
    dataProtection.PersistKeysToFileSystem(Directory.CreateDirectory(resolvedKeyRingPath));
}
else if (!builder.Environment.IsDevelopment())
{
    throw new InvalidOperationException(
        "DataProtection:KeyRingPath yapılandırılmalıdır. Kalıcı bir birime bağlanmazsa "
        + "LDAP ve CBS parolaları uygulama yeniden başlatıldığında çözülemez hâle gelir.");
}
builder.Services.AddAuthorization();
builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserPermissions, HttpCurrentUserPermissions>();
builder.Services.AddScoped<ICurrentUserScope, CurrentUserScopeProvider>();
builder.Services.AddScoped<IArchiveUnitDirectory, ArchiveUnitDirectory>();
builder.Services.AddScoped<Mbb.Archive.Modules.PhysicalArchive.Application.Abstractions.ILoanBorrowerDirectory, LoanBorrowerDirectory>();
builder.Services.AddScoped<Mbb.Archive.Modules.Retention.Contracts.IArchiveTransferSource, ArchiveTransferSource>();
builder.Services.Configure<ArchiveProtectionOptions>(builder.Configuration.GetSection("Archive:ProtectionSynchronization"));
builder.Services.AddScoped<ArchiveProtectionService>();
builder.Services.AddHostedService<ArchiveProtectionWorker>();
builder.Services.AddScoped<Mbb.Archive.Modules.Workflow.Application.IWorkflowAssignmentDirectory, WorkflowAssignmentDirectory>();
builder.Services.AddScoped<Mbb.Archive.Modules.Operations.Application.Notifications.ISmsSender, MalatyaSmsSenderAdapter>();
builder.Services.AddScoped<IAuditDisplayResolver, AuditDisplayResolver>();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

builder.Services.AddRabbitMqMessaging(builder.Configuration);
builder.Services.AddDocumentsModule(builder.Configuration);
builder.Services.AddClassificationModule(builder.Configuration);
builder.Services.AddProcessingModule(builder.Configuration);
builder.Services.AddSearchModule(builder.Configuration);
builder.Services.AddAccessControlModule(builder.Configuration);
builder.Services.AddArchiveModule(builder.Configuration);
builder.Services.AddCollectionsModule(builder.Configuration);
builder.Services.AddGeoModule(builder.Configuration);
builder.Services.AddOrganizationModule(builder.Configuration);
builder.Services.AddRetentionModule(builder.Configuration);
builder.Services.AddAuditModule(builder.Configuration);
builder.Services.AddWorkflowModule(builder.Configuration);
builder.Services.AddPhysicalArchiveModule(builder.Configuration);
builder.Services.AddEvidenceModule(builder.Configuration);
builder.Services.AddOfficialCorrespondenceModule(builder.Configuration);
builder.Services.AddOperationsModule(builder.Configuration);


var app = builder.Build();

// Anahtar halkasının yeri açıkça günlüğe düşer: yanlış dizine yazmak,
// yedeklenmeyen bir dizine yazmakla aynı sonucu verir ve sessizdir.
app.Logger.LogInformation(
    "Data Protection anahtar halkası: {KeyRingPath}",
    resolvedKeyRingPath ?? "(varsayılan kullanıcı profili — yalnız geliştirme)");

DeploymentGuard.EnsureFoundationIsNotExposedUnauthenticated(app);

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();

if (!app.Environment.IsDevelopment())
    app.UseHsts();

app.UseCors("WebApp");
app.UseAuthentication();
app.UseMiddleware<RequestAccessAuditMiddleware>();
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
        Predicate = check => check.Tags.Contains("ready"),

        // Tek kelimelik yanıt hangi bağımlılığın düştüğünü göstermez;
        // operasyon ekibi bileşen kırılımını burada görür.
        ResponseWriter = static async (context, report) =>
        {
            context.Response.ContentType = "application/json; charset=utf-8";

            await context.Response.WriteAsJsonAsync(
                new
                {
                    status = report.Status.ToString(),
                    durationMs = report.TotalDuration.TotalMilliseconds,
                    checks = report.Entries.Select(
                        entry => new
                        {
                            name = entry.Key,
                            status = entry.Value.Status.ToString(),
                            description = entry.Value.Description
                        })
                });
        }
    });

app.MapOpenApi();
app.MapDocumentsEndpoints();
app.MapClassificationEndpoints();
app.MapProcessingEndpoints();
app.MapSearchEndpoints();
app.MapAccessEndpoints();
app.MapArchiveEndpoints();
app.MapCollectionsEndpoints();
app.MapGeoEndpoints();
app.MapGeoAdminEndpoints();
app.MapOrganizationEndpoints();
app.MapRetentionEndpoints();
app.MapAuditEndpoints();
app.MapWorkflowEndpoints();
app.MapPhysicalArchiveEndpoints();
app.MapEvidenceEndpoints();
app.MapOfficialCorrespondenceEndpoints();
app.MapOperationsEndpoints();
app.MapBrandingEndpoints();
app.MapCurrentUser();
app.MapArchiveProtection();
app.MapSubjectVisibility();

app.Run();
