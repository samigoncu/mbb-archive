namespace Mbb.Archive.Modules.Retention.Application.Disposition;

public sealed class DispositionReviewPolicy
{
    public DispositionReviewPolicy(int requiredIndependentReviews)
    {
        if (requiredIndependentReviews is < 2 or > 20)
            throw new ArgumentOutOfRangeException(nameof(requiredIndependentReviews), "Independent review count must be between 2 and 20.");
        RequiredIndependentReviews = requiredIndependentReviews;
    }
    public int RequiredIndependentReviews { get; }
}
