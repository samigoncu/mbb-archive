using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Operations.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBrandingSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "branding",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    site_title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    institution_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    logo_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    favicon_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    login_image_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    updated_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_branding", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "branding_assets",
                schema: "operations",
                columns: table => new
                {
                    kind = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    content = table.Column<byte[]>(type: "bytea", nullable: false),
                    content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    file_name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    updated_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_branding_assets", x => x.kind);
                });

            migrationBuilder.InsertData(
                schema: "operations",
                table: "branding",
                columns: new[] { "id", "description", "favicon_url", "institution_name", "login_image_url", "logo_url", "site_title", "updated_at", "updated_by", "version" },
                values: new object[] { 1, "Kurumsal Belge, Arşiv ve Dijital Hafıza Platformu", null, "Malatya Büyükşehir Belediyesi", null, null, "MBB Kurumsal Arşiv", null, "system", 1L });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "branding",
                schema: "operations");

            migrationBuilder.DropTable(
                name: "branding_assets",
                schema: "operations");
        }
    }
}
