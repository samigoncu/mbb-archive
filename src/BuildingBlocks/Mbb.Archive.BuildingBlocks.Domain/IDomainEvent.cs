namespace Mbb.Archive.BuildingBlocks.Domain;

/// <summary>
/// İş alanında gerçekleşmiş, domain açısından anlamlı bir olayı temsil eder.
/// Teknik queue/message contract'ı değildir.
/// </summary>
public interface IDomainEvent
{
    DateTimeOffset OccurredAt { get; }
}
