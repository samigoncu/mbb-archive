using Mbb.Archive.BuildingBlocks.Messaging.RabbitMq;
using Mbb.Archive.Worker.SecurityScan;

var builder = Host.CreateApplicationBuilder(args);
Mbb.Archive.Hosting.LocalStoragePaths.Configure(builder.Configuration, builder.Environment);

builder.Services.AddRabbitMqMessaging(builder.Configuration);

builder.Services
    .AddOptions<SecurityScanOptions>()
    .Bind(builder.Configuration.GetSection(SecurityScanOptions.SectionName))
    .Validate(options => !string.IsNullOrWhiteSpace(options.Queue), "SecurityScan:Queue is required.")
    .Validate(options => !string.IsNullOrWhiteSpace(options.StagingRootPath), "SecurityScan:StagingRootPath is required.")
    .ValidateOnStart();

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<StagingFileReader>();
builder.Services.AddSingleton<FileSignatureDetector>();
builder.Services.AddSingleton<ClamAvClient>();
builder.Services.AddHostedService<SecurityScanWorker>();

await builder.Build().RunAsync();
