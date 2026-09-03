using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Audit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "audit");

            migrationBuilder.CreateTable(
                name: "entries",
                schema: "audit",
                columns: table => new
                {
                    sequence = table.Column<long>(type: "bigint", nullable: false),
                    message_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: true),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    received_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    previous_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    entry_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_entries", x => x.sequence);
                });

            migrationBuilder.CreateIndex(
                name: "IX_entries_document_id_occurred_at",
                schema: "audit",
                table: "entries",
                columns: new[] { "document_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_entries_event_name_occurred_at",
                schema: "audit",
                table: "entries",
                columns: new[] { "event_name", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_entries_message_id",
                schema: "audit",
                table: "entries",
                column: "message_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "entries",
                schema: "audit");
        }
    }
}
