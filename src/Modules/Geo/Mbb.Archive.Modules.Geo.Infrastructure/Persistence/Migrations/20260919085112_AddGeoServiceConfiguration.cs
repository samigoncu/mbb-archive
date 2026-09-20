using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Geo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGeoServiceConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "basemap",
                schema: "geo",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    tile_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    attribution = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    center_latitude = table.Column<double>(type: "double precision", nullable: false),
                    center_longitude = table.Column<double>(type: "double precision", nullable: false),
                    zoom = table.Column<int>(type: "integer", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    updated_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_basemap", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "services",
                schema: "geo",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    base_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    user_name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    password_cipher = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    timeout_seconds = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_services", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "service_layers",
                schema: "geo",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    service_id = table.Column<Guid>(type: "uuid", nullable: false),
                    layer_name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    entity_type = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    name_attribute = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    visible_by_default = table.Column<bool>(type: "boolean", nullable: false),
                    opacity_percent = table.Column<int>(type: "integer", nullable: false),
                    image_format = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_queryable = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_layers", x => x.id);
                    table.ForeignKey(
                        name: "FK_service_layers_services_service_id",
                        column: x => x.service_id,
                        principalSchema: "geo",
                        principalTable: "services",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "geo",
                table: "basemap",
                columns: new[] { "id", "attribution", "center_latitude", "center_longitude", "tile_url", "updated_at", "updated_by", "version", "zoom" },
                values: new object[] { 1, "", 38.355200000000004, 38.3095, "", null, "system", 1L, 12 });

            migrationBuilder.CreateIndex(
                name: "IX_service_layers_service_id_layer_name",
                schema: "geo",
                table: "service_layers",
                columns: new[] { "service_id", "layer_name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "basemap",
                schema: "geo");

            migrationBuilder.DropTable(
                name: "service_layers",
                schema: "geo");

            migrationBuilder.DropTable(
                name: "services",
                schema: "geo");
        }
    }
}
