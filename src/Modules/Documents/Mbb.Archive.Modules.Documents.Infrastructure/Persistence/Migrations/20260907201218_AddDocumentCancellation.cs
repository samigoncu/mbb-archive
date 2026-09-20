using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentCancellation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "cancellation_operation_actor",
                schema: "documents",
                table: "documents",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "cancellation_operation_id",
                schema: "documents",
                table: "documents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cancellation_operation_reason",
                schema: "documents",
                table: "documents",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cancellation_reason",
                schema: "documents",
                table: "documents",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "cancelled_at",
                schema: "documents",
                table: "documents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cancelled_by",
                schema: "documents",
                table: "documents",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status_before_cancellation",
                schema: "documents",
                table: "documents",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "cancellation_operation_actor",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "cancellation_operation_id",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "cancellation_operation_reason",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "cancellation_reason",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "cancelled_at",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "cancelled_by",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "status_before_cancellation",
                schema: "documents",
                table: "documents");
        }
    }
}
