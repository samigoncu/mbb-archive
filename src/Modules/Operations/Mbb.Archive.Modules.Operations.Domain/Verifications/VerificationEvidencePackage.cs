using System.Security.Cryptography;
using System.Text;
using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Operations.Domain.Verifications;

public sealed record VerificationEvidencePackage(Guid Id, Guid RunId, string RunType,
    DateTimeOffset StartedAt, DateTimeOffset CompletedAt, string Result, long CheckedItems,
    long FailedItems, string ReportJson, string Sha256, DateTimeOffset GeneratedAt, string GeneratorVersion)
{
    public static VerificationEvidencePackage Generate(Guid runId, string runType, DateTimeOffset started,
        DateTimeOffset completed, string result, long checkedItems, long failedItems, string reportJson,
        DateTimeOffset generatedAt, string generatorVersion)
    {
        if (completed < started || checkedItems < 0 || failedItems < 0 || failedItems > checkedItems || string.IsNullOrWhiteSpace(generatorVersion))
            throw new DomainRuleViolationException("Verification evidence values are invalid.");
        var canonical = $"{runId:N}\n{runType}\n{started:O}\n{completed:O}\n{result}\n{checkedItems}\n{failedItems}\n{reportJson}";
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical))).ToLowerInvariant();
        return new(Guid.CreateVersion7(), runId, runType, started, completed, result, checkedItems, failedItems,
            reportJson, hash, generatedAt, generatorVersion.Trim());
    }
}
