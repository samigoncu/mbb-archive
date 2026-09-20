using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mbb.Archive.BuildingBlocks.Presentation;
using Mbb.Archive.Modules.Retention.Application.Disposition;
using Mbb.Archive.Modules.Retention.Domain.Rules;

namespace Mbb.Archive.Modules.Retention.Presentation;

internal static class DispositionEndpoints
{
    internal static void MapDispositionEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/v1/retention/dispositions").WithTags("Disposition").RequireAuthorization();
        group.MapGet("/", async (int? page, int? pageSize, string? status, DispositionQueryHandler handler, CancellationToken ct) =>
        {
            var result = await handler.List(page ?? 1, pageSize ?? 25, status, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:retention.read");
        group.MapGet("/{id:guid}", async (Guid id, DispositionQueryHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Get(id, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(result.Value);
        }).RequireAuthorization("permission:retention.read");
        group.MapPost("/", async (CreateRequest request, DispositionCommandHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new CreateDispositionCommand(request.RequestId,
                request.RetentionCaseId, request.Action, request.Reason, request.CommissionReference), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error)
                : Results.Created($"/api/v1/retention/dispositions/{result.Value}", new { id = result.Value });
        }).RequireAuthorization("permission:retention.disposition.prepare");
        MapAdvance(group, "/{id:guid}/submit", DispositionOperation.Submit, "retention.disposition.prepare");
        MapAdvance(group, "/{id:guid}/reviews", DispositionOperation.Review, "retention.disposition.review");
        MapAdvance(group, "/{id:guid}/approve", DispositionOperation.Approve, "retention.disposition.approve");
        MapAdvance(group, "/{id:guid}/accept-transfer", DispositionOperation.AcceptTransfer, "retention.transfers.accept");
        MapAdvance(group, "/{id:guid}/keep-permanently", DispositionOperation.KeepPermanently, "retention.disposition.execute");
        MapAdvance(group, "/{id:guid}/execute-destruction", DispositionOperation.ExecuteDestruction, "retention.disposition.execute");
        group.MapPost("/{id:guid}/commission", async (Guid id, CommissionRequest request, DispositionCommandHandler handler, CancellationToken ct) =>
        {
            var result = await handler.ConfigureCommission(new(id, request.ExpectedVersion, request.Members ?? [], request.ValidFrom, request.ValidUntil), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:retention.commissions.manage");
        group.MapPost("/{id:guid}/commission/delegate", async (Guid id, DelegateRequest request, DispositionCommandHandler handler, CancellationToken ct) =>
        {
            var result = await handler.DelegateCommission(new(id, request.ExpectedVersion, request.Member, request.Delegate,
                request.Reference, request.ValidFrom, request.ValidUntil), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:retention.commissions.manage");
        group.MapPost("/{id:guid}/package", async (Guid id, PackageRequest request, TransferPackageHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Create(id, request.ExpectedVersion, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Ok(new { packageId = result.Value });
        }).RequireAuthorization("permission:retention.export");
        group.MapGet("/{id:guid}/package", async (Guid id, TransferPackageHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Open(id, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.Stream(result.Value, "application/zip", $"arsiv-devir-{id}.zip");
        }).RequireAuthorization("permission:retention.export").WithAccessAudit("access.transfer-package-exported.v1", "disposition", "id");
        group.MapPost("/{id:guid}/package/{packageId:guid}/verify", async (Guid id, Guid packageId, long expectedVersion,
            HttpRequest request, TransferPackageHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Verify(id, packageId, expectedVersion, request.Body, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization("permission:retention.transfers.accept")
            .WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(2L * 1024 * 1024 * 1024));
        group.MapGet("/{id:guid}/receipt", async (Guid id, DispositionReceiptHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(id, ct);
            return result.IsFailure ? ApiResults.Problem(result.Error)
                : Results.File(result.Value, "application/json", $"arsiv-tutanagi-{id}.json");
        }).RequireAuthorization("permission:retention.export")
            .WithAccessAudit("access.disposition-receipt-exported.v1", "disposition", "id");
        group.MapGet("/capabilities", (DispositionReviewPolicy policy) => Results.Ok(new
        {
            requiredIndependentReviews = policy.RequiredIndependentReviews, transferAcceptance = true, permanentRetention = true,
            destructionExecution = false, physicalDestructionRecording = true, digitalOriginalsPreserved = true,
            transferPackages = true, explicitCommissionMembership = true,
            destructionNote = "Gerçekleşen fiziksel imha, tutanak sürümü ve gerçekleşme bilgileriyle kaydedilir. Dijital asıllar ve sürümler kalıcı korunur."
        })).RequireAuthorization("permission:retention.read");
    }

    private static void MapAdvance(RouteGroupBuilder group, string pattern, DispositionOperation operation, string permission)
        => group.MapPost(pattern, async (Guid id, AdvanceRequest request, DispositionCommandHandler handler, CancellationToken ct) =>
        {
            var result = await handler.Handle(new AdvanceDispositionCommand(id, request.ExpectedVersion,
                operation, request.Reason ?? "", request.Approved, request.Reference ?? "", request.ReceivingArchive ?? "",
                request.EvidenceDocumentId, request.EvidenceVersionId, request.Method ?? "", request.Location ?? "",
                request.Witnesses ?? "", request.ExecutedAt), ct);
            return result.IsFailure ? ApiResults.Problem(result.Error) : Results.NoContent();
        }).RequireAuthorization($"permission:{permission}");

    private sealed record CreateRequest(Guid RequestId, Guid RetentionCaseId, DispositionAction Action, string Reason, string CommissionReference);
    private sealed record AdvanceRequest(long ExpectedVersion, string? Reason, bool Approved, string? Reference, string? ReceivingArchive,
        Guid? EvidenceDocumentId, Guid? EvidenceVersionId, string? Method, string? Location, string? Witnesses, DateTimeOffset? ExecutedAt);
    private sealed record CommissionRequest(long ExpectedVersion, string[]? Members, DateTimeOffset ValidFrom, DateTimeOffset ValidUntil);
    private sealed record DelegateRequest(long ExpectedVersion, string Member, string Delegate, string Reference, DateTimeOffset ValidFrom, DateTimeOffset ValidUntil);
    private sealed record PackageRequest(long ExpectedVersion);
}
