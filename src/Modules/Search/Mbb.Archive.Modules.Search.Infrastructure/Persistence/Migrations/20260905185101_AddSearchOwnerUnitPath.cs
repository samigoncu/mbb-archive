using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Search.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSearchOwnerUnitPath : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "owner_unit_path",
                schema: "search",
                table: "documents",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "owner_unit_path",
                schema: "search",
                table: "documents");
        }
    }
}
