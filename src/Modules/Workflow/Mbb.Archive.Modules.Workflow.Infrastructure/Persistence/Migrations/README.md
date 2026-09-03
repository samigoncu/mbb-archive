# Workflow migrations
```bash
dotnet ef migrations add InitialWorkflow --project src/Modules/Workflow/Mbb.Archive.Modules.Workflow.Infrastructure --startup-project src/Host/Mbb.Archive.Api --context WorkflowDbContext --output-dir Persistence/Migrations
```
