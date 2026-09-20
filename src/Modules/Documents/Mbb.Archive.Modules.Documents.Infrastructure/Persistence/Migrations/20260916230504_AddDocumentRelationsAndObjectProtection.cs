using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentRelationsAndObjectProtection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "owns_storage_legal_hold",
                schema: "documents",
                table: "document_versions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "protected_until",
                schema: "documents",
                table: "document_versions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "protection_checked_at",
                schema: "documents",
                table: "document_versions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "protection_error",
                schema: "documents",
                table: "document_versions",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "storage_legal_hold",
                schema: "documents",
                table: "document_versions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "storage_version_id",
                schema: "documents",
                table: "document_versions",
                type: "character varying(1024)",
                maxLength: 1024,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "document_relations",
                schema: "documents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ModifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RemovedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_relations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "ux_document_relations_active_pair",
                schema: "documents",
                table: "document_relations",
                columns: new[] { "SourceDocumentId", "TargetDocumentId", "Kind" },
                unique: true,
                filter: "\"RemovedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_document_relations_TargetDocumentId",
                schema: "documents",
                table: "document_relations",
                column: "TargetDocumentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "document_relations",
                schema: "documents");

            migrationBuilder.DropColumn(
                name: "owns_storage_legal_hold",
                schema: "documents",
                table: "document_versions");

            migrationBuilder.DropColumn(
                name: "protected_until",
                schema: "documents",
                table: "document_versions");

            migrationBuilder.DropColumn(
                name: "protection_checked_at",
                schema: "documents",
                table: "document_versions");

            migrationBuilder.DropColumn(
                name: "protection_error",
                schema: "documents",
                table: "document_versions");

            migrationBuilder.DropColumn(
                name: "storage_legal_hold",
                schema: "documents",
                table: "document_versions");

            migrationBuilder.DropColumn(
                name: "storage_version_id",
                schema: "documents",
                table: "document_versions");
        }
    }
}
