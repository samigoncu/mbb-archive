using Mbb.Archive.BuildingBlocks.Domain;

namespace Mbb.Archive.Modules.Classification.Domain.FilePlans;

public sealed class FilePlanItem : Entity<FilePlanItemId>
{
    private FilePlanItem() { }

    internal FilePlanItem(
        FilePlanItemId id,
        FilePlanId filePlanId,
        FilePlanItemId? parentId,
        string code,
        string title,
        int level,
        bool isSelectable)
        : base(id)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainRuleViolationException("File plan item code is required.");
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainRuleViolationException("File plan item title is required.");
        if (level is < 1 or > 12)
            throw new DomainRuleViolationException("File plan item level must be between 1 and 12.");

        FilePlanId = filePlanId;
        ParentId = parentId;
        Code = code.Trim();
        Title = title.Trim();
        Level = level;
        IsSelectable = isSelectable;
        IsActive = true;
    }

    public FilePlanId FilePlanId { get; private set; }
    public FilePlanItemId? ParentId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public int Level { get; private set; }
    public bool IsSelectable { get; private set; }
    public bool IsActive { get; private set; }

    public void Rename(string title, string? description)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainRuleViolationException("File plan item title is required.");
        Title = title.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
    }

    /// <summary>
    /// Başlık, açıklama ve "bu koda dosya açılabilir" işareti düzeltilir.
    /// </summary>
    /// <remarks>
    /// Kod değiştirilemez: belgeler, dijital dosyalar, fiziksel klasörler ve
    /// birim–SDP atamaları koda göre bağlanır; kodu düzenletmek bu bağları
    /// sessizce koparırdı. Yanlış kod pasife alınıp doğrusu açılır.
    /// </remarks>
    public void Update(string title, string? description, bool isSelectable)
    {
        Rename(title, description);
        IsSelectable = isSelectable;
    }

    /// <summary>Pasif konuya yeni belge ya da dosya bağlanamaz; mevcutlar korunur.</summary>
    public void SetActive(bool isActive) => IsActive = isActive;
}
