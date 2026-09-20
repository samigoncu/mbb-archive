using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentVersionCancellation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "current_version_number",
                schema: "documents",
                table: "documents",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cancellation_reason",
                schema: "documents",
                table: "document_versions",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "cancellation_request_id",
                schema: "documents",
                table: "document_versions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "cancelled_at",
                schema: "documents",
                table: "document_versions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cancelled_by",
                schema: "documents",
                table: "document_versions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "replacement_version_number",
                schema: "documents",
                table: "document_versions",
                type: "integer",
                nullable: true);

            // Preserve the current version of every pre-existing document.
            migrationBuilder.Sql("""
                UPDATE documents.documents AS d
                SET current_version_number = (
                    SELECT MAX(v.version_number)
                    FROM documents.document_versions AS v
                    WHERE v.document_id = d.id
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "current_version_number",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "cancellation_reason",
                schema: "documents",
                table: "document_versions");

            migrationBuilder.DropColumn(
                name: "cancellation_request_id",
                schema: "documents",
                table: "document_versions");

            migrationBuilder.DropColumn(
                name: "cancelled_at",
                schema: "documents",
                table: "document_versions");

            migrationBuilder.DropColumn(
                name: "cancelled_by",
                schema: "documents",
                table: "document_versions");

            migrationBuilder.DropColumn(
                name: "replacement_version_number",
                schema: "documents",
                table: "document_versions");
        }
    }
}
