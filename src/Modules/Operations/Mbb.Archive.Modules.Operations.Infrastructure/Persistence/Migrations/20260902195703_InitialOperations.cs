using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Operations.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "operations");

            migrationBuilder.CreateTable(
                name: "alert_instances",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    rule_id = table.Column<Guid>(type: "uuid", nullable: false),
                    deduplication_key = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    severity = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    current_value = table.Column<decimal>(type: "numeric", nullable: false),
                    occurrence_count = table.Column<int>(type: "integer", nullable: false),
                    opened_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_observed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    resolved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    acknowledged_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    acknowledgement_note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    acknowledged_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alert_instances", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "alert_rules",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    metric = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    comparison = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    threshold = table.Column<decimal>(type: "numeric", nullable: false),
                    severity = table.Column<string>(type: "text", nullable: false),
                    evaluation_window = table.Column<TimeSpan>(type: "interval", nullable: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alert_rules", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "notification_deliveries",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    channel = table.Column<string>(type: "text", nullable: false),
                    target = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    next_attempt_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    sent_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notification_deliveries", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "recovery_drills",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    backup_reference = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    target_environment = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    target_rpo_minutes = table.Column<int>(type: "integer", nullable: false),
                    target_rto_minutes = table.Column<int>(type: "integer", nullable: false),
                    requested_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    planned_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    actual_rpo_minutes = table.Column<int>(type: "integer", nullable: true),
                    actual_rto_minutes = table.Column<int>(type: "integer", nullable: true),
                    evidence_reference = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recovery_drills", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "storage_capacity_snapshots",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_bytes = table.Column<long>(type: "bigint", nullable: false),
                    artifact_bytes = table.Column<long>(type: "bigint", nullable: false),
                    capacity_bytes = table.Column<long>(type: "bigint", nullable: false),
                    captured_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_storage_capacity_snapshots", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "storage_forecasts",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    current_bytes = table.Column<long>(type: "bigint", nullable: false),
                    capacity_bytes = table.Column<long>(type: "bigint", nullable: false),
                    utilization_percent = table.Column<double>(type: "double precision", nullable: false),
                    daily_growth_bytes = table.Column<double>(type: "double precision", nullable: false),
                    forecast_30_days = table.Column<long>(type: "bigint", nullable: false),
                    forecast_90_days = table.Column<long>(type: "bigint", nullable: false),
                    estimated_days_remaining = table.Column<int>(type: "integer", nullable: true),
                    generated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_storage_forecasts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "verification_evidence",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    run_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    result = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    checked_items = table.Column<long>(type: "bigint", nullable: false),
                    failed_items = table.Column<long>(type: "bigint", nullable: false),
                    report_json = table.Column<string>(type: "jsonb", nullable: false),
                    sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    generated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    generator_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verification_evidence", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "verification_runs",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    requested_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    checked_items = table.Column<long>(type: "bigint", nullable: false),
                    failed_items = table.Column<long>(type: "bigint", nullable: false),
                    summary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    results_json = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verification_runs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "alert_escalations",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    target = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    severity = table.Column<string>(type: "text", nullable: false),
                    escalated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    alert_instance_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alert_escalations", x => x.id);
                    table.ForeignKey(
                        name: "FK_alert_escalations_alert_instances_alert_instance_id",
                        column: x => x.alert_instance_id,
                        principalSchema: "operations",
                        principalTable: "alert_instances",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_alert_escalations_alert_instance_id",
                schema: "operations",
                table: "alert_escalations",
                column: "alert_instance_id");

            migrationBuilder.CreateIndex(
                name: "IX_alert_instances_rule_id_deduplication_key_status",
                schema: "operations",
                table: "alert_instances",
                columns: new[] { "rule_id", "deduplication_key", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_alert_rules_code",
                schema: "operations",
                table: "alert_rules",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_recovery_drills_planned_at",
                schema: "operations",
                table: "recovery_drills",
                column: "planned_at");

            migrationBuilder.CreateIndex(
                name: "IX_verification_runs_kind_started_at",
                schema: "operations",
                table: "verification_runs",
                columns: new[] { "kind", "started_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alert_escalations",
                schema: "operations");

            migrationBuilder.DropTable(
                name: "alert_rules",
                schema: "operations");

            migrationBuilder.DropTable(
                name: "notification_deliveries",
                schema: "operations");

            migrationBuilder.DropTable(
                name: "recovery_drills",
                schema: "operations");

            migrationBuilder.DropTable(
                name: "storage_capacity_snapshots",
                schema: "operations");

            migrationBuilder.DropTable(
                name: "storage_forecasts",
                schema: "operations");

            migrationBuilder.DropTable(
                name: "verification_evidence",
                schema: "operations");

            migrationBuilder.DropTable(
                name: "verification_runs",
                schema: "operations");

            migrationBuilder.DropTable(
                name: "alert_instances",
                schema: "operations");
        }
    }
}
