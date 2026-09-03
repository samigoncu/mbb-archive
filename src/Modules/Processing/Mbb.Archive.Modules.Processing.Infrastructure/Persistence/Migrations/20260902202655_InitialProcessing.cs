using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Processing.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialProcessing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "processing");

            migrationBuilder.CreateTable(
                name: "inbox_messages",
                schema: "processing",
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
                name: "jobs",
                schema: "processing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    sha256_hash = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    mime_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    stage = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    failure_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    failure_detail = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    pdf_page_count = table.Column<int>(type: "integer", nullable: true),
                    pdf_version = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    pdf_has_embedded_text = table.Column<bool>(type: "boolean", nullable: true),
                    ocr_average_confidence = table.Column<double>(type: "double precision", nullable: true),
                    ocr_page_count = table.Column<int>(type: "integer", nullable: true),
                    ocr_engine = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ocr_languages = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    concurrency_version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_jobs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                schema: "processing",
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
                name: "artifacts",
                schema: "processing",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    processing_job_id = table.Column<Guid>(type: "uuid", nullable: false),
                    artifact_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    storage_key = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    mime_type = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    sha256_hash = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_artifacts", x => x.id);
                    table.ForeignKey(
                        name: "FK_artifacts_jobs_processing_job_id",
                        column: x => x.processing_job_id,
                        principalSchema: "processing",
                        principalTable: "jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_processing_artifact_job_type",
                schema: "processing",
                table: "artifacts",
                columns: new[] { "processing_job_id", "artifact_type" });

            migrationBuilder.CreateIndex(
                name: "ix_processing_job_stage",
                schema: "processing",
                table: "jobs",
                column: "stage");

            migrationBuilder.CreateIndex(
                name: "ux_processing_job_document_version",
                schema: "processing",
                table: "jobs",
                column: "document_version_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_processing_outbox_dispatch",
                schema: "processing",
                table: "outbox_messages",
                columns: new[] { "processed_at", "dead_lettered_at", "next_attempt_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "artifacts",
                schema: "processing");

            migrationBuilder.DropTable(
                name: "inbox_messages",
                schema: "processing");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "processing");

            migrationBuilder.DropTable(
                name: "jobs",
                schema: "processing");
        }
    }
}
