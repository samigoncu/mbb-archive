using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Geo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialGeo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "geo");

            migrationBuilder.CreateTable(
                name: "entities",
                schema: "geo",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    layer_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    feature_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    entity_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    geojson = table.Column<string>(type: "text", nullable: false),
                    properties = table.Column<string>(type: "text", nullable: true),
                    external_reference = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_version = table.Column<long>(type: "bigint", nullable: false),
                    max_latitude = table.Column<double>(type: "double precision", nullable: false),
                    max_longitude = table.Column<double>(type: "double precision", nullable: false),
                    min_latitude = table.Column<double>(type: "double precision", nullable: false),
                    min_longitude = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_entities", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "document_relations",
                schema: "geo",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    geo_entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    relation_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    valid_from = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    valid_to = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_relations", x => x.id);
                    table.ForeignKey(
                        name: "FK_document_relations_entities_geo_entity_id",
                        column: x => x.geo_entity_id,
                        principalSchema: "geo",
                        principalTable: "entities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_geo_relations_document",
                schema: "geo",
                table: "document_relations",
                column: "document_id");

            migrationBuilder.CreateIndex(
                name: "ix_geo_relations_entity",
                schema: "geo",
                table: "document_relations",
                column: "geo_entity_id");

            migrationBuilder.CreateIndex(
                name: "ix_geo_entities_name",
                schema: "geo",
                table: "entities",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "ix_geo_entities_type",
                schema: "geo",
                table: "entities",
                column: "entity_type");

            migrationBuilder.CreateIndex(
                name: "ux_geo_entities_provider_layer_feature",
                schema: "geo",
                table: "entities",
                columns: new[] { "provider", "layer_name", "feature_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "document_relations",
                schema: "geo");

            migrationBuilder.DropTable(
                name: "entities",
                schema: "geo");
        }
    }
}
