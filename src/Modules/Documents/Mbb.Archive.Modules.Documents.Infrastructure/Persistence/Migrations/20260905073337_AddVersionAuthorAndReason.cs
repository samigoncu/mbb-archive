using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVersionAuthorAndReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "submitted_by",
                schema: "documents",
                table: "file_ingestions",
                type: "character varying(200)",
                maxLength: 200,
                // Alan eklenmeden önce oluşmuş kayıtlarda özne bilinmiyor;
                // boş dize yerine açık bir işaret bırakılır.
                nullable: false,
                defaultValue: "unknown");

            migrationBuilder.AddColumn<string>(
                name: "version_reason",
                schema: "documents",
                table: "file_ingestions",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "created_by",
                schema: "documents",
                table: "document_versions",
                type: "character varying(200)",
                maxLength: 200,
                // Alan eklenmeden önce oluşmuş kayıtlarda özne bilinmiyor;
                // boş dize yerine açık bir işaret bırakılır.
                nullable: false,
                defaultValue: "unknown");

            migrationBuilder.AddColumn<string>(
                name: "reason",
                schema: "documents",
                table: "document_versions",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "submitted_by",
                schema: "documents",
                table: "file_ingestions");

            migrationBuilder.DropColumn(
                name: "version_reason",
                schema: "documents",
                table: "file_ingestions");

            migrationBuilder.DropColumn(
                name: "created_by",
                schema: "documents",
                table: "document_versions");

            migrationBuilder.DropColumn(
                name: "reason",
                schema: "documents",
                table: "document_versions");
        }
    }
}
