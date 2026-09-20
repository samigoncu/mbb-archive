using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhysicalFolderOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "digital_dossier_id",
                schema: "physical_archive",
                table: "folders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "owner_unit_id",
                schema: "physical_archive",
                table: "folders",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_folders_digital_dossier_id",
                schema: "physical_archive",
                table: "folders",
                column: "digital_dossier_id");

            migrationBuilder.CreateIndex(
                name: "IX_folders_owner_unit_id_file_plan_code",
                schema: "physical_archive",
                table: "folders",
                columns: new[] { "owner_unit_id", "file_plan_code" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_folders_digital_dossier_id",
                schema: "physical_archive",
                table: "folders");

            migrationBuilder.DropIndex(
                name: "IX_folders_owner_unit_id_file_plan_code",
                schema: "physical_archive",
                table: "folders");

            migrationBuilder.DropColumn(
                name: "digital_dossier_id",
                schema: "physical_archive",
                table: "folders");

            migrationBuilder.DropColumn(
                name: "owner_unit_id",
                schema: "physical_archive",
                table: "folders");
        }
    }
}
