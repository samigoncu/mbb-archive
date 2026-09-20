using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Organization.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMalatyaApiSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "malatya_api_settings",
                schema: "organization",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    base_url = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    user_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    password_cipher = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    sms_provider = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_directory_sync_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    last_tested_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    last_test_status = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    updated_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_malatya_api_settings", x => x.id);
                });

            migrationBuilder.InsertData(
                schema: "organization",
                table: "malatya_api_settings",
                columns: new[] { "id", "base_url", "is_directory_sync_enabled", "last_test_status", "last_tested_at", "password_cipher", "sms_provider", "updated_at", "updated_by", "user_name", "version" },
                values: new object[] { 1, "https://api.malatya.bel.tr", false, null, null, null, "MBB", null, "system", "", 1L });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "malatya_api_settings",
                schema: "organization");
        }
    }
}
