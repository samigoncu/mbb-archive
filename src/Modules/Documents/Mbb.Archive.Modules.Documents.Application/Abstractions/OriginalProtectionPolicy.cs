using Mbb.Archive.Modules.Documents.Contracts;

namespace Mbb.Archive.Modules.Documents.Application.Abstractions;

public static class OriginalProtectionPolicy
{
    public static DocumentProtectionRequirement Combine(IEnumerable<DocumentProtectionRequirement> requirements)
    {
        var values = requirements.ToArray();
        return new(Guid.Empty, values.Select(x => x.RetainUntil).Max(),
            values.Any(x => x.LegalHold), values.Any(x => x.Permanent));
    }
}
