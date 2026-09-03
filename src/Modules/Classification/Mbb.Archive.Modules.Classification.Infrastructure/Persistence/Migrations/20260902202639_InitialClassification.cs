using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Classification.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialClassification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "classification");

            migrationBuilder.CreateTable(
                name: "document_classifications",
                schema: "classification",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_plan_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    classified_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_classifications", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "document_metadata_sets",
                schema: "classification",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    schema_id = table.Column<Guid>(type: "uuid", nullable: false),
                    schema_version = table.Column<int>(type: "integer", nullable: false),
                    values_json = table.Column<string>(type: "jsonb", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_metadata_sets", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "file_plans",
                schema: "classification",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    version = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    authority = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                    effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_file_plans", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "metadata_schemas",
                schema: "classification",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    published_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_metadata_schemas", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                schema: "classification",
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
                name: "file_plan_items",
                schema: "classification",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    parent_id = table.Column<Guid>(type: "uuid", nullable: true),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    level = table.Column<int>(type: "integer", nullable: false),
                    is_selectable = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_file_plan_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_file_plan_items_file_plans_file_plan_id",
                        column: x => x.file_plan_id,
                        principalSchema: "classification",
                        principalTable: "file_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "metadata_fields",
                schema: "classification",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    schema_id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    label = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    field_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_required = table.Column<bool>(type: "boolean", nullable: false),
                    is_searchable = table.Column<bool>(type: "boolean", nullable: false),
                    is_repeatable = table.Column<bool>(type: "boolean", nullable: false),
                    options_json = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_metadata_fields", x => x.id);
                    table.ForeignKey(
                        name: "FK_metadata_fields_metadata_schemas_schema_id",
                        column: x => x.schema_id,
                        principalSchema: "classification",
                        principalTable: "metadata_schemas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_document_classification_document",
                schema: "classification",
                table: "document_classifications",
                column: "document_id");

            migrationBuilder.CreateIndex(
                name: "ux_document_classification",
                schema: "classification",
                table: "document_classifications",
                columns: new[] { "document_id", "file_plan_item_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_document_metadata_schema",
                schema: "classification",
                table: "document_metadata_sets",
                columns: new[] { "document_id", "schema_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_file_plan_item_code",
                schema: "classification",
                table: "file_plan_items",
                columns: new[] { "file_plan_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_file_plan_code_version",
                schema: "classification",
                table: "file_plans",
                columns: new[] { "code", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_metadata_field_key",
                schema: "classification",
                table: "metadata_fields",
                columns: new[] { "schema_id", "key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_metadata_schema_key_version",
                schema: "classification",
                table: "metadata_schemas",
                columns: new[] { "key", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_classification_outbox_dispatch",
                schema: "classification",
                table: "outbox_messages",
                columns: new[] { "processed_at", "dead_lettered_at", "next_attempt_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "document_classifications",
                schema: "classification");

            migrationBuilder.DropTable(
                name: "document_metadata_sets",
                schema: "classification");

            migrationBuilder.DropTable(
                name: "file_plan_items",
                schema: "classification");

            migrationBuilder.DropTable(
                name: "metadata_fields",
                schema: "classification");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "classification");

            migrationBuilder.DropTable(
                name: "file_plans",
                schema: "classification");

            migrationBuilder.DropTable(
                name: "metadata_schemas",
                schema: "classification");
        }
    }
}
