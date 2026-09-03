using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialPhysicalArchive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "physical_archive");

            migrationBuilder.CreateTable(
                name: "folders",
                schema: "physical_archive",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    barcode = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    file_plan_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    location_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_moved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_folders", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "loans",
                schema: "physical_archive",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    folder_id = table.Column<Guid>(type: "uuid", nullable: false),
                    borrower_subject_id = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    purpose = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    checked_out_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    due_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    returned_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_loans", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "locations",
                schema: "physical_archive",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    parent_id = table.Column<Guid>(type: "uuid", nullable: true),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    barcode = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    capacity = table.Column<int>(type: "integer", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_locations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                schema: "physical_archive",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_outbox_messages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "folder_documents",
                schema: "physical_archive",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    folder_id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    linked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_folder_documents", x => x.id);
                    table.ForeignKey(
                        name: "FK_folder_documents_folders_folder_id",
                        column: x => x.folder_id,
                        principalSchema: "physical_archive",
                        principalTable: "folders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_folder_documents_document_id",
                schema: "physical_archive",
                table: "folder_documents",
                column: "document_id");

            migrationBuilder.CreateIndex(
                name: "IX_folder_documents_folder_id_document_id",
                schema: "physical_archive",
                table: "folder_documents",
                columns: new[] { "folder_id", "document_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_folders_barcode",
                schema: "physical_archive",
                table: "folders",
                column: "barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_folders_location_id",
                schema: "physical_archive",
                table: "folders",
                column: "location_id");

            migrationBuilder.CreateIndex(
                name: "IX_loans_due_at",
                schema: "physical_archive",
                table: "loans",
                column: "due_at");

            migrationBuilder.CreateIndex(
                name: "IX_loans_folder_id_status",
                schema: "physical_archive",
                table: "loans",
                columns: new[] { "folder_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_locations_barcode",
                schema: "physical_archive",
                table: "locations",
                column: "barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_locations_code",
                schema: "physical_archive",
                table: "locations",
                column: "code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "folder_documents",
                schema: "physical_archive");

            migrationBuilder.DropTable(
                name: "loans",
                schema: "physical_archive");

            migrationBuilder.DropTable(
                name: "locations",
                schema: "physical_archive");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "physical_archive");

            migrationBuilder.DropTable(
                name: "folders",
                schema: "physical_archive");
        }
    }
}
