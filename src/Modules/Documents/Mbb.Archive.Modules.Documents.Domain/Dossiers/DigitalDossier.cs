using Mbb.Archive.BuildingBlocks.Domain;
namespace Mbb.Archive.Modules.Documents.Domain.Dossiers;

public sealed class DigitalDossier : AggregateRoot<Guid>
{
    private DigitalDossier() { }
    public Guid OwnerUnitId { get; private set; }
    public Guid FilePlanId { get; private set; }
    public Guid FilePlanItemId { get; private set; }
    public string FilePlanVersion { get; private set; } = "";
    public string FilePlanCode { get; private set; } = "";
    public string FilePlanTitle { get; private set; } = "";
    public string Title { get; private set; } = "";
    public int Year { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public void Rename(string title)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > 300)
            throw new DomainRuleViolationException("Klasör adı 1–300 karakter olmalıdır.");
        Title = title.Trim();
    }
    public static DigitalDossier Create(Guid owner, Guid plan, Guid item, string version,
        string code, string subject, string title, int year, DateTimeOffset now)
    {
        if (owner == Guid.Empty || plan == Guid.Empty || item == Guid.Empty)
            throw new DomainRuleViolationException("Birim ve dosya planı zorunludur.");
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > 300 || year is < 1900 or > 9999)
            throw new DomainRuleViolationException("Başlık en fazla 300 karakter, yıl 1900–9999 arasında olmalıdır.");
        return new() { Id = Guid.CreateVersion7(), OwnerUnitId = owner, FilePlanId = plan,
            FilePlanItemId = item, FilePlanVersion = version, FilePlanCode = code,
            FilePlanTitle = subject, Title = title.Trim(), Year = year, CreatedAt = now };
    }
}
