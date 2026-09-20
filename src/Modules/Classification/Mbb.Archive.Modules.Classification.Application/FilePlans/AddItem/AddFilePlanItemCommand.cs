using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Classification.Application.FilePlans.AddItem;
public sealed record AddFilePlanItemCommand(Guid FilePlanId,Guid? ParentId,string Code,string Title,int Level,bool IsSelectable,string? Description=null) : ICommand<Guid>;
