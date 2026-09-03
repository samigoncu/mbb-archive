using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Search.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "search");

            migrationBuilder.CreateTable(
                name: "documents",
                schema: "search",
                columns: table => new
                {
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    document_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    mime_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    text_artifact_storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ocr_json_artifact_storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    classification_json = table.Column<string>(type: "jsonb", nullable: false),
                    metadata_json = table.Column<string>(type: "jsonb", nullable: false),
                    revision = table.Column<long>(type: "bigint", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_documents", x => x.document_id);
                });

            migrationBuilder.CreateTable(
                name: "inbox_messages",
                schema: "search",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    processed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inbox_messages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "index_requests",
                schema: "search",
                columns: table => new
                {
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    projection_revision = table.Column<long>(type: "bigint", nullable: false),
                    requested_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    next_attempt_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    indexed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    dead_lettered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    locked_by = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    locked_until = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_index_requests", x => x.document_id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                schema: "search",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    next_attempt_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    processed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    dead_lettered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    locked_by = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    locked_until = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_outbox_messages", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_search_documents_updated_at",
                schema: "search",
                table: "documents",
                column: "updated_at");

            migrationBuilder.CreateIndex(
                name: "ix_search_index_requests_dispatch",
                schema: "search",
                table: "index_requests",
                columns: new[] { "indexed_at", "dead_lettered_at", "next_attempt_at" });

            migrationBuilder.CreateIndex(
                name: "ix_search_outbox_dispatch",
                schema: "search",
                table: "outbox_messages",
                columns: new[] { "processed_at", "dead_lettered_at", "next_attempt_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "documents",
                schema: "search");

            migrationBuilder.DropTable(
                name: "inbox_messages",
                schema: "search");

            migrationBuilder.DropTable(
                name: "index_requests",
                schema: "search");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "search");
        }
    }
}
