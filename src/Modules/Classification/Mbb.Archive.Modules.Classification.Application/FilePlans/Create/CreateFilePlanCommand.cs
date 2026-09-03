using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Classification.Application.FilePlans.Create;
public sealed record CreateFilePlanCommand(string Code,string Name,string Version,string Authority,DateOnly EffectiveFrom,DateOnly? EffectiveTo) : ICommand<Guid>;
