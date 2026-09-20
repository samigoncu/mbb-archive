using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDigitalDossiers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "dossier_id",
                schema: "documents",
                table: "documents",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "digital_dossiers",
                schema: "documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_plan_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_plan_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    file_plan_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    file_plan_title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    year = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_digital_dossiers", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_documents_dossier_id",
                schema: "documents",
                table: "documents",
                column: "dossier_id");

            migrationBuilder.CreateIndex(
                name: "IX_digital_dossiers_owner_unit_id_file_plan_id_file_plan_code_~",
                schema: "documents",
                table: "digital_dossiers",
                columns: new[] { "owner_unit_id", "file_plan_id", "file_plan_code", "year" });

            migrationBuilder.AddForeignKey(
                name: "FK_documents_digital_dossiers_dossier_id",
                schema: "documents",
                table: "documents",
                column: "dossier_id",
                principalSchema: "documents",
                principalTable: "digital_dossiers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_documents_digital_dossiers_dossier_id",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropTable(
                name: "digital_dossiers",
                schema: "documents");

            migrationBuilder.DropIndex(
                name: "IX_documents_dossier_id",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "dossier_id",
                schema: "documents",
                table: "documents");
        }
    }
}
