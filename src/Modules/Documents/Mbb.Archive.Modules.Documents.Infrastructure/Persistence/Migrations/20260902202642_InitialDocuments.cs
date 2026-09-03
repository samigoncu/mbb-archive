using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "documents");

            migrationBuilder.CreateTable(
                name: "documents",
                schema: "documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    archived_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    concurrency_version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_documents", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "file_ingestions",
                schema: "documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_file_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    client_content_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    declared_size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    staging_storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    sha256_hash = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: true),
                    stored_size_bytes = table.Column<long>(type: "bigint", nullable: true),
                    detected_mime_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    security_scanner = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    security_scanned_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    rejection_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    rejection_detail = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    original_storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    original_stored_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    staged_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    concurrency_version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_file_ingestions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "inbox_messages",
                schema: "documents",
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
                name: "outbox_messages",
                schema: "documents",
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

            migrationBuilder.CreateTable(
                name: "document_versions",
                schema: "documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_number = table.Column<int>(type: "integer", nullable: false),
                    storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    sha256_hash = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    mime_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_document_versions_documents_document_id",
                        column: x => x.document_id,
                        principalSchema: "documents",
                        principalTable: "documents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_document_versions_sha256",
                schema: "documents",
                table: "document_versions",
                column: "sha256_hash");

            migrationBuilder.CreateIndex(
                name: "ux_document_versions_document_version",
                schema: "documents",
                table: "document_versions",
                columns: new[] { "document_id", "version_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_documents_created_at",
                schema: "documents",
                table: "documents",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_documents_status",
                schema: "documents",
                table: "documents",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_file_ingestions_document_id",
                schema: "documents",
                table: "file_ingestions",
                column: "document_id");

            migrationBuilder.CreateIndex(
                name: "ix_file_ingestions_sha256",
                schema: "documents",
                table: "file_ingestions",
                column: "sha256_hash");

            migrationBuilder.CreateIndex(
                name: "ix_file_ingestions_status",
                schema: "documents",
                table: "file_ingestions",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_inbox_processed_at",
                schema: "documents",
                table: "inbox_messages",
                column: "processed_at");

            migrationBuilder.CreateIndex(
                name: "ix_outbox_dispatch",
                schema: "documents",
                table: "outbox_messages",
                columns: new[] { "processed_at", "dead_lettered_at", "next_attempt_at", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_outbox_lease",
                schema: "documents",
                table: "outbox_messages",
                column: "locked_until");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "document_versions",
                schema: "documents");

            migrationBuilder.DropTable(
                name: "file_ingestions",
                schema: "documents");

            migrationBuilder.DropTable(
                name: "inbox_messages",
                schema: "documents");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "documents");

            migrationBuilder.DropTable(
                name: "documents",
                schema: "documents");
        }
    }
}
