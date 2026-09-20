using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class WorkItemAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "assigned_at",
                schema: "workflow",
                table: "work_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "assigned_by",
                schema: "workflow",
                table: "work_items",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "assignee_subject_id",
                schema: "workflow",
                table: "work_items",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "assigned_at",
                schema: "workflow",
                table: "work_items");

            migrationBuilder.DropColumn(
                name: "assigned_by",
                schema: "workflow",
                table: "work_items");

            migrationBuilder.DropColumn(
                name: "assignee_subject_id",
                schema: "workflow",
                table: "work_items");
        }
    }
}
