using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialOfficialCorrespondence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "official_correspondence");

            migrationBuilder.CreateTable(
                name: "eyp_inspections",
                schema: "official_correspondence",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: true),
                    document_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    file_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    package_sha256 = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    part_count = table.Column<int>(type: "integer", nullable: false),
                    relationship_count = table.Column<int>(type: "integer", nullable: false),
                    structural_status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    official_validation_status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    structural_report_json = table.Column<string>(type: "jsonb", nullable: false),
                    official_report_json = table.Column<string>(type: "jsonb", nullable: false),
                    inspected_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_eyp_inspections", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                schema: "official_correspondence",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_outbox_messages", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_eyp_inspections_package_sha256",
                schema: "official_correspondence",
                table: "eyp_inspections",
                column: "package_sha256");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "eyp_inspections",
                schema: "official_correspondence");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "official_correspondence");
        }
    }
}
