using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Collections.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCollections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "collections");

            migrationBuilder.CreateTable(
                name: "collections",
                schema: "collections",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    owner_subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    is_shared = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_collections", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "collection_items",
                schema: "collections",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    collection_id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    added_by = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    added_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_collection_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_collection_items_collections_collection_id",
                        column: x => x.collection_id,
                        principalSchema: "collections",
                        principalTable: "collections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_collection_items_document",
                schema: "collections",
                table: "collection_items",
                column: "document_id");

            migrationBuilder.CreateIndex(
                name: "ux_collection_items_collection_document",
                schema: "collections",
                table: "collection_items",
                columns: new[] { "collection_id", "document_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_collections_owner_name",
                schema: "collections",
                table: "collections",
                columns: new[] { "owner_subject", "name" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "collection_items",
                schema: "collections");

            migrationBuilder.DropTable(
                name: "collections",
                schema: "collections");
        }
    }
}
