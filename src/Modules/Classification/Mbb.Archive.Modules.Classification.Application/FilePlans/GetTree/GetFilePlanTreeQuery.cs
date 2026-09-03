using Mbb.Archive.BuildingBlocks.Application;
namespace Mbb.Archive.Modules.Classification.Application.FilePlans.GetTree;
public sealed record GetFilePlanTreeQuery(Guid Id) : IQuery<FilePlanTree>;
public sealed record FilePlanTree(Guid Id,string Code,string Name,string Version,string Authority,DateOnly EffectiveFrom,DateOnly? EffectiveTo,IReadOnlyList<FilePlanNode> Items);
public sealed record FilePlanNode(Guid Id,Guid? ParentId,string Code,string Title,int Level,bool IsSelectable,bool IsActive);
