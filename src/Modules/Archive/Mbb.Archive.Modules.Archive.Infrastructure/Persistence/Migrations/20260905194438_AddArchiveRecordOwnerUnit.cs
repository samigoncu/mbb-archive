using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Archive.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddArchiveRecordOwnerUnit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "owner_unit_path",
                schema: "archive",
                table: "records",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_records_owner_unit_path",
                schema: "archive",
                table: "records",
                column: "owner_unit_path");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_records_owner_unit_path",
                schema: "archive",
                table: "records");

            migrationBuilder.DropColumn(
                name: "owner_unit_path",
                schema: "archive",
                table: "records");
        }
    }
}
