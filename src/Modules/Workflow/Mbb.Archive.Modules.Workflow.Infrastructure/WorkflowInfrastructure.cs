using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mbb.Archive.BuildingBlocks.Application;
using Mbb.Archive.Modules.Workflow.Application;
using Mbb.Archive.Modules.Workflow.Domain.Definitions;
using Mbb.Archive.Modules.Workflow.Domain.Instances;

namespace Mbb.Archive.Modules.Workflow.Infrastructure;

public sealed class WorkflowDbContext :
    DbContext,
    IUnitOfWork<WorkflowBoundary>,
    IOutbox<WorkflowBoundary>
{
    public WorkflowDbContext(DbContextOptions<WorkflowDbContext> options)
        : base(options)
    {
    }

    internal DbSet<WorkflowDefinition> Definitions => Set<WorkflowDefinition>();
    internal DbSet<WorkflowInstance> Instances => Set<WorkflowInstance>();
    internal DbSet<WorkflowOutboxMessage> OutboxMessages => Set<WorkflowOutboxMessage>();

    private readonly List<IIntegrationEvent> _pendingEvents = [];
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public void Enqueue(IIntegrationEvent integrationEvent)
        => _pendingEvents.Add(integrationEvent);

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var integrationEvent in _pendingEvents)
        {
            if (OutboxMessages.Local.Any(x => x.Id == integrationEvent.EventId))
                continue;

            OutboxMessages.Add(
                new WorkflowOutboxMessage(
                    integrationEvent.EventId,
                    integrationEvent.EventName,
                    JsonSerializer.Serialize(
                        integrationEvent,
                        integrationEvent.GetType(),
                        JsonOptions),
                    integrationEvent.OccurredAt));
        }

        int result;
        try { result = await base.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException ex) { throw new ConcurrencyConflictException("Görev başka bir işlemde değişti. Listeyi yenileyin.", ex); }
        _pendingEvents.Clear();
        return result;
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("workflow");

        builder.Entity<WorkflowDefinition>(entity =>
        {
            entity.ToTable("definitions", "workflow");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.Key).HasColumnName("key").HasMaxLength(100);
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(300);
            entity.Property(x => x.Version).HasColumnName("version");
            entity.Property(x => x.IsPublished).HasColumnName("is_published");
            entity.HasIndex(x => new { x.Key, x.Version }).IsUnique();

            entity.HasMany(x => x.Nodes)
                .WithOne()
                .HasForeignKey(x => x.DefinitionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(x => x.Transitions)
                .WithOne()
                .HasForeignKey(x => x.DefinitionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Metadata.FindNavigation(nameof(WorkflowDefinition.Nodes))
                ?.SetPropertyAccessMode(PropertyAccessMode.Field);

            entity.Metadata.FindNavigation(nameof(WorkflowDefinition.Transitions))
                ?.SetPropertyAccessMode(PropertyAccessMode.Field);

            entity.Ignore(x => x.DomainEvents);
        });

        builder.Entity<WorkflowNode>(entity =>
        {
            entity.ToTable("nodes", "workflow");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.DefinitionId).HasColumnName("definition_id");
            entity.Property(x => x.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(50);
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(300);
            entity.Property(x => x.Permission).HasColumnName("permission").HasMaxLength(200);
            entity.Property(x => x.SlaMinutes).HasColumnName("sla_minutes");
            entity.Property(x => x.TimerDelayMinutes).HasColumnName("timer_delay_minutes");
            entity.Property(x => x.ServiceOperation).HasColumnName("service_operation").HasMaxLength(300);
        });

        builder.Entity<WorkflowTransition>(entity =>
        {
            entity.ToTable("transitions", "workflow");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.DefinitionId).HasColumnName("definition_id");
            entity.Property(x => x.FromNodeId).HasColumnName("from_node_id");
            entity.Property(x => x.ToNodeId).HasColumnName("to_node_id");
            entity.Property(x => x.ConditionExpression).HasColumnName("condition_expression").HasMaxLength(1000);
            entity.Property(x => x.IsDefault).HasColumnName("is_default");
        });

        builder.Entity<WorkflowInstance>(entity =>
        {
            entity.ToTable("instances", "workflow");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.DefinitionId).HasColumnName("definition_id");
            entity.Property(x => x.DocumentId).HasColumnName("document_id");
            entity.Property(x => x.CurrentNodeId).HasColumnName("current_node_id");
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
            entity.Property(x => x.StartedAt).HasColumnName("started_at");
            entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
            entity.Property(x => x.WakeAt).HasColumnName("wake_at");
            entity.Property(x => x.ConcurrencyVersion)
                .HasColumnName("concurrency_version")
                .IsConcurrencyToken();

            entity.HasMany(x => x.Variables)
                .WithOne()
                .HasForeignKey(x => x.InstanceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(x => x.WorkItems)
                .WithOne()
                .HasForeignKey(x => x.InstanceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Metadata.FindNavigation(nameof(WorkflowInstance.Variables))
                ?.SetPropertyAccessMode(PropertyAccessMode.Field);

            entity.Metadata.FindNavigation(nameof(WorkflowInstance.WorkItems))
                ?.SetPropertyAccessMode(PropertyAccessMode.Field);

            entity.Ignore(x => x.DomainEvents);
        });

        builder.Entity<WorkflowVariable>(entity =>
        {
            entity.ToTable("variables", "workflow");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.InstanceId).HasColumnName("instance_id");
            entity.Property(x => x.Key).HasColumnName("key").HasMaxLength(200);
            entity.Property(x => x.Value).HasColumnName("value").HasMaxLength(4000);
            entity.HasIndex(x => new { x.InstanceId, x.Key }).IsUnique();
        });

        builder.Entity<WorkflowWorkItem>(entity =>
        {
            entity.ToTable("work_items", "workflow");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.InstanceId).HasColumnName("instance_id");
            entity.Property(x => x.NodeId).HasColumnName("node_id");
            entity.Property(x => x.Permission).HasColumnName("permission").HasMaxLength(200);
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.DueAt).HasColumnName("due_at");
            entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
            entity.Property(x => x.CompletedBy).HasColumnName("completed_by").HasMaxLength(300);
            entity.Property(x => x.Outcome).HasColumnName("outcome").HasMaxLength(200);
            entity.Property(x => x.AssigneeSubjectId).HasColumnName("assignee_subject_id").HasMaxLength(300);
            entity.Property(x => x.AssignedBy).HasColumnName("assigned_by").HasMaxLength(300);
            entity.Property(x => x.AssignedAt).HasColumnName("assigned_at");
            entity.Property(x => x.EscalationLevel).HasColumnName("escalation_level");
            entity.HasIndex(x => new { x.Status, x.DueAt });
        });

        builder.Entity<WorkflowOutboxMessage>(entity =>
        {
            entity.ToTable("outbox_messages", "workflow");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            entity.Property(x => x.EventName).HasColumnName("event_name").HasMaxLength(200);
            entity.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
            entity.Property(x => x.OccurredAt).HasColumnName("occurred_at");
            entity.Property(x => x.NextAttemptAt).HasColumnName("next_attempt_at");
            entity.Property(x => x.ProcessedAt).HasColumnName("processed_at");
            entity.Property(x => x.AttemptCount).HasColumnName("attempt_count");
            entity.Property(x => x.LastError).HasColumnName("last_error").HasMaxLength(4000);
        });

        base.OnModelCreating(builder);
    }
}

internal sealed class EfWorkflowRepository : IWorkflowRepository, IWorkflowQueries
{
    private readonly WorkflowDbContext _db;

    public EfWorkflowRepository(WorkflowDbContext db) => _db = db;

    public async Task AddDefinitionAsync(WorkflowDefinition definition, CancellationToken ct)
        => await _db.Definitions.AddAsync(definition, ct);

    public Task<WorkflowDefinition?> GetDefinitionAsync(Guid id, CancellationToken ct)
        => _db.Definitions
            .Include(x => x.Nodes)
            .Include(x => x.Transitions)
            .SingleOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddInstanceAsync(WorkflowInstance instance, CancellationToken ct)
        => await _db.Instances.AddAsync(instance, ct);

    public Task<WorkflowInstance?> GetInstanceAsync(Guid id, CancellationToken ct)
        => _db.Instances
            .Include(x => x.Variables)
            .Include(x => x.WorkItems)
            .SingleOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IReadOnlyList<Guid>> GetDueTimerInstanceIdsAsync(
        DateTimeOffset now,
        int take,
        CancellationToken ct)
        => await _db.Instances
            .AsNoTracking()
            .Where(x =>
                x.Status == WorkflowInstanceStatus.WaitingTimer
                && x.WakeAt != null
                && x.WakeAt <= now)
            .OrderBy(x => x.WakeAt)
            .Select(x => x.Id)
            .Take(take)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Guid>> GetOverdueTaskInstanceIdsAsync(
        DateTimeOffset now,
        int take,
        CancellationToken ct)
        => await _db.Instances
            .AsNoTracking()
            .Where(x => x.WorkItems.Any(w =>
                w.Status != WorkflowWorkItemStatus.Completed
                && w.DueAt != null
                && w.DueAt <= now))
            .OrderBy(x => x.StartedAt)
            .Select(x => x.Id)
            .Take(take)
            .ToListAsync(ct);

    public async Task<PagedResult<DocumentWorkflowItem>> GetDocumentHistoryAsync(Guid documentId, PageRequest page, CancellationToken ct)
    {
        var rows = from instance in _db.Instances.AsNoTracking()
                   from item in instance.WorkItems
                   join definition in _db.Definitions.AsNoTracking() on instance.DefinitionId equals definition.Id
                   where instance.DocumentId == documentId
                   select new { instance, item, definition };
        var count = await rows.LongCountAsync(ct);
        var items = await rows.OrderByDescending(x => x.item.CreatedAt).ThenBy(x => x.item.Id)
            .Skip((page.Page - 1) * page.PageSize).Take(page.PageSize)
            .Select(x => new DocumentWorkflowItem(x.item.Id, x.instance.Id, x.definition.Name,
                x.definition.Nodes.Where(n => n.Id == x.item.NodeId).Select(n => n.Name).FirstOrDefault() ?? "Görev",
                x.instance.Status.ToString(), x.item.Status.ToString(), x.item.CreatedAt, x.item.DueAt,
                x.item.AssigneeSubjectId, x.item.AssignedBy, x.item.AssignedAt,
                x.item.CompletedBy, x.item.CompletedAt, x.item.Outcome, x.item.EscalationLevel)).ToArrayAsync(ct);
        return new(items, page.Page, page.PageSize, count);
    }

    public async Task<IReadOnlyList<WorkflowWorkItemListItem>> GetWorkItemsAsync(
        string? status,
        IReadOnlyCollection<string>? permissions,
        string? assigneeSubject,
        DateTimeOffset now,
        int take,
        CancellationToken ct)
    {
        var rows =
            from instance in _db.Instances.AsNoTracking()
            from item in instance.WorkItems
            join definition in _db.Definitions.AsNoTracking()
                on instance.DefinitionId equals definition.Id
            select new { instance, item, definition };

        if (status == "completed")
        {
            rows = rows.Where(x => x.item.Status == WorkflowWorkItemStatus.Completed);
        }
        else if (status == "open")
        {
            rows = rows.Where(x => x.item.Status != WorkflowWorkItemStatus.Completed
                && x.instance.Status != WorkflowInstanceStatus.Completed);
        }

        if (permissions is not null)
        {
            var allowed = permissions.ToArray();
            rows = rows.Where(x => allowed.Contains(x.item.Permission));
        }

        if (assigneeSubject is not null)
            rows = rows.Where(x => x.item.AssigneeSubjectId == null || x.item.AssigneeSubjectId == assigneeSubject || x.item.CompletedBy == assigneeSubject);

        return await rows
            .OrderByDescending(x => x.item.CreatedAt)
            .Take(take)
            .Select(x => new WorkflowWorkItemListItem(
                x.item.Id,
                x.instance.Id,
                x.definition.Id,
                x.definition.Name,
                x.instance.DocumentId,
                x.definition.Nodes
                    .Where(n => n.Id == x.item.NodeId)
                    .Select(n => n.Name)
                    .FirstOrDefault() ?? string.Empty,
                x.item.Permission,
                x.item.Status.ToString(),
                x.item.CreatedAt,
                x.item.DueAt,
                x.item.DueAt != null && x.item.DueAt <= now,
                x.item.AssigneeSubjectId,
                x.instance.ConcurrencyVersion,
                x.definition.Key.StartsWith("assigned-"),
                x.item.CompletedBy,
                x.item.CompletedAt,
                x.item.Outcome,
                x.item.AssignedBy,
                x.item.AssignedAt))
            .ToListAsync(ct);
    }

    public Task<IReadOnlyList<WorkflowWorkItemListItem>> GetOpenWorkItemsAsync(
        IReadOnlyCollection<string>? permissions,
        string? assigneeSubject,
        DateTimeOffset now,
        int take,
        CancellationToken ct)
        => GetWorkItemsAsync("open", permissions, assigneeSubject, now, take, ct);
}

public static class WorkflowModule
{
    public static IServiceCollection AddWorkflowModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Workflow");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("Connection string 'Workflow' is not configured.");

        services.AddDbContext<WorkflowDbContext>(
            options => options.UseNpgsql(connectionString));

        services.AddSingleton(TimeProvider.System);
        services.AddScoped<DocumentWorkflowHistoryHandler>();
        services.AddScoped<EfWorkflowRepository>();
        services.AddScoped<IWorkflowRepository>(
            sp => sp.GetRequiredService<EfWorkflowRepository>());
        services.AddScoped<IWorkflowQueries>(
            sp => sp.GetRequiredService<EfWorkflowRepository>());
        services.AddScoped<IUnitOfWork<WorkflowBoundary>>(
            sp => sp.GetRequiredService<WorkflowDbContext>());
        services.AddScoped<IOutbox<WorkflowBoundary>>(
            sp => sp.GetRequiredService<WorkflowDbContext>());
        services.AddSingleton<WorkflowConditionEvaluator>();
        services.AddScoped<WorkflowRuntime>();
        services.AddScoped<WorkflowCommandHandlers>();
        services.AddScoped<WorkflowAssignmentHandler>();
        services.AddScoped<GetMyWorkItemsQueryHandler>();
        services.AddHostedService<WorkflowOutboxPublisher>();

        services.AddScoped<
            Mbb.Archive.BuildingBlocks.Observability.IOperationalSnapshotContributor,
            WorkflowOperationalSnapshotContributor>();
        services.AddHostedService<WorkflowMonitorService>();

        return services;
    }
}
