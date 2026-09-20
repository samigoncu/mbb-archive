using Microsoft.EntityFrameworkCore;
using Mbb.Archive.BuildingBlocks.Application.Security;

namespace Mbb.Archive.Modules.Organization.Infrastructure.Persistence;

/// <summary>Birim–SDP atamaları konu kodunu taşır; atanmış kod silinemez.</summary>
internal sealed class OrganizationFilePlanUsage(OrganizationDbContext db) : IFilePlanCodeUsage
{
    public Task<bool> HasReferencesAsync(string code, CancellationToken ct)
        => db.FilePlanAssignments.AnyAsync(x => x.Code == code, ct);
}
