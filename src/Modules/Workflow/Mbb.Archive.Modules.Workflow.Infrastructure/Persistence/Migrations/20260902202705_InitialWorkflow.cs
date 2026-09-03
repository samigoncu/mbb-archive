using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Workflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "workflow");

            migrationBuilder.CreateTable(
                name: "definitions",
                schema: "workflow",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false),
                    is_published = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_definitions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "instances",
                schema: "workflow",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    current_node_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    wake_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    concurrency_version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_instances", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "outbox_messages",
                schema: "workflow",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    next_attempt_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    processed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_outbox_messages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "nodes",
                schema: "workflow",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    permission = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    sla_minutes = table.Column<int>(type: "integer", nullable: true),
                    timer_delay_minutes = table.Column<int>(type: "integer", nullable: true),
                    service_operation = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_nodes", x => x.id);
                    table.ForeignKey(
                        name: "FK_nodes_definitions_definition_id",
                        column: x => x.definition_id,
                        principalSchema: "workflow",
                        principalTable: "definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "transitions",
                schema: "workflow",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_node_id = table.Column<Guid>(type: "uuid", nullable: false),
                    to_node_id = table.Column<Guid>(type: "uuid", nullable: false),
                    condition_expression = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_default = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transitions", x => x.id);
                    table.ForeignKey(
                        name: "FK_transitions_definitions_definition_id",
                        column: x => x.definition_id,
                        principalSchema: "workflow",
                        principalTable: "definitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "variables",
                schema: "workflow",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    instance_id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    value = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_variables", x => x.id);
                    table.ForeignKey(
                        name: "FK_variables_instances_instance_id",
                        column: x => x.instance_id,
                        principalSchema: "workflow",
                        principalTable: "instances",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "work_items",
                schema: "workflow",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    instance_id = table.Column<Guid>(type: "uuid", nullable: false),
                    node_id = table.Column<Guid>(type: "uuid", nullable: false),
                    permission = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    due_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    outcome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    escalation_level = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_items_instances_instance_id",
                        column: x => x.instance_id,
                        principalSchema: "workflow",
                        principalTable: "instances",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_definitions_key_version",
                schema: "workflow",
                table: "definitions",
                columns: new[] { "key", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_nodes_definition_id",
                schema: "workflow",
                table: "nodes",
                column: "definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_transitions_definition_id",
                schema: "workflow",
                table: "transitions",
                column: "definition_id");

            migrationBuilder.CreateIndex(
                name: "IX_variables_instance_id_key",
                schema: "workflow",
                table: "variables",
                columns: new[] { "instance_id", "key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_work_items_instance_id",
                schema: "workflow",
                table: "work_items",
                column: "instance_id");

            migrationBuilder.CreateIndex(
                name: "IX_work_items_status_due_at",
                schema: "workflow",
                table: "work_items",
                columns: new[] { "status", "due_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "nodes",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "outbox_messages",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "transitions",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "variables",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "work_items",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "definitions",
                schema: "workflow");

            migrationBuilder.DropTable(
                name: "instances",
                schema: "workflow");
        }
    }
}
