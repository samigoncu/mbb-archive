using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialRetention : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "retention");

            migrationBuilder.CreateTable(
                name: "cases",
                schema: "retention",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    archive_record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    rule_id = table.Column<Guid>(type: "uuid", nullable: false),
                    rule_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    action = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    trigger_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    due_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    active_hold_count = table.Column<int>(type: "integer", nullable: false),
                    concurrency_version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cases", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "inbox_messages",
                schema: "retention",
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
                name: "legal_holds",
                schema: "retention",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    retention_case_id = table.Column<Guid>(type: "uuid", nullable: false),
                    archive_record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    placed_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    placed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    released_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_legal_holds", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                schema: "retention",
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
                name: "rules",
                schema: "retention",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    retention_months = table.Column<int>(type: "integer", nullable: false),
                    action = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rules", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cases_archive_record_id",
                schema: "retention",
                table: "cases",
                column: "archive_record_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cases_status_due_at",
                schema: "retention",
                table: "cases",
                columns: new[] { "status", "due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_legal_holds_retention_case_id_released_at",
                schema: "retention",
                table: "legal_holds",
                columns: new[] { "retention_case_id", "released_at" });

            migrationBuilder.CreateIndex(
                name: "IX_rules_code",
                schema: "retention",
                table: "rules",
                column: "code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cases",
                schema: "retention");

            migrationBuilder.DropTable(
                name: "inbox_messages",
                schema: "retention");

            migrationBuilder.DropTable(
                name: "legal_holds",
                schema: "retention");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "retention");

            migrationBuilder.DropTable(
                name: "rules",
                schema: "retention");
        }
    }
}
