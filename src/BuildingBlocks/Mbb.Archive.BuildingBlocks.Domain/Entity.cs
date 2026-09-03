namespace Mbb.Archive.BuildingBlocks.Domain;

public abstract class Entity<TId>
    where TId : notnull
{
    protected Entity(TId id)
    {
        Id = id;
    }

    protected Entity()
    {
        Id = default!;
    }

    public TId Id { get; protected set; }
}
