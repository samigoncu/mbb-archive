using Microsoft.VisualStudio.TestTools.UnitTesting;
using Mbb.Archive.BuildingBlocks.Domain;
using Mbb.Archive.Modules.Workflow.Application;
using Mbb.Archive.Modules.Workflow.Domain.Definitions;

namespace Mbb.Archive.Modules.Workflow.UnitTests;

[TestClass]
public sealed class WorkflowV2Tests
{
    [TestMethod]
    public void PublishedDefinition_RequiresExactlyOneStart()
    {
        var definition = WorkflowDefinition.Create("approval", "Approval", 1);
        definition.AddNode(WorkflowNodeType.EndEvent, "End", null, null, null, null);

        Assert.ThrowsExactly<DomainRuleViolationException>(definition.Publish);
    }

    [TestMethod]
    public void UserTask_RequiresPermission()
    {
        var definition = WorkflowDefinition.Create("approval", "Approval", 1);

        Assert.ThrowsExactly<DomainRuleViolationException>(
            () => definition.AddNode(
                WorkflowNodeType.UserTask,
                "Approve",
                null,
                60,
                null,
                null));
    }

    [TestMethod]
    public void ConditionEvaluator_RejectsUnknownExpression()
    {
        var evaluator = new WorkflowConditionEvaluator();

        Assert.IsFalse(
            evaluator.Evaluate(
                "System.IO.File.Delete(*)",
                new Dictionary<string, string>()));
    }
}
