using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Operations.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CompleteOperationsAutomation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                schema: "operations",
                table: "recovery_drills",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<Guid>(
                name: "alert_id",
                schema: "operations",
                table: "notification_deliveries",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "body",
                schema: "operations",
                table: "notification_deliveries",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "provider_reference",
                schema: "operations",
                table: "notification_deliveries",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "subject",
                schema: "operations",
                table: "notification_deliveries",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "breached_since",
                schema: "operations",
                table: "alert_rules",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "last_evaluated_at",
                schema: "operations",
                table: "alert_rules",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "last_evaluation_error",
                schema: "operations",
                table: "alert_rules",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "notification_channel",
                schema: "operations",
                table: "alert_rules",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "notification_target",
                schema: "operations",
                table: "alert_rules",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                schema: "operations",
                table: "alert_rules",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                schema: "operations",
                table: "alert_instances",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.CreateTable(
                name: "automation_events",
                schema: "operations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    actor = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    detail = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    audit_published_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_automation_events", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_notification_deliveries_status_next_attempt_at",
                schema: "operations",
                table: "notification_deliveries",
                columns: new[] { "status", "next_attempt_at" });

            migrationBuilder.CreateIndex(
                name: "IX_alert_instances_rule_id",
                schema: "operations",
                table: "alert_instances",
                column: "rule_id",
                unique: true,
                filter: "status <> 'Resolved'");

            migrationBuilder.CreateIndex(
                name: "IX_automation_events_occurred_at",
                schema: "operations",
                table: "automation_events",
                column: "occurred_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "automation_events",
                schema: "operations");

            migrationBuilder.DropIndex(
                name: "IX_notification_deliveries_status_next_attempt_at",
                schema: "operations",
                table: "notification_deliveries");

            migrationBuilder.DropIndex(
                name: "IX_alert_instances_rule_id",
                schema: "operations",
                table: "alert_instances");

            migrationBuilder.DropColumn(
                name: "xmin",
                schema: "operations",
                table: "recovery_drills");

            migrationBuilder.DropColumn(
                name: "alert_id",
                schema: "operations",
                table: "notification_deliveries");

            migrationBuilder.DropColumn(
                name: "body",
                schema: "operations",
                table: "notification_deliveries");

            migrationBuilder.DropColumn(
                name: "provider_reference",
                schema: "operations",
                table: "notification_deliveries");

            migrationBuilder.DropColumn(
                name: "subject",
                schema: "operations",
                table: "notification_deliveries");

            migrationBuilder.DropColumn(
                name: "breached_since",
                schema: "operations",
                table: "alert_rules");

            migrationBuilder.DropColumn(
                name: "last_evaluated_at",
                schema: "operations",
                table: "alert_rules");

            migrationBuilder.DropColumn(
                name: "last_evaluation_error",
                schema: "operations",
                table: "alert_rules");

            migrationBuilder.DropColumn(
                name: "notification_channel",
                schema: "operations",
                table: "alert_rules");

            migrationBuilder.DropColumn(
                name: "notification_target",
                schema: "operations",
                table: "alert_rules");

            migrationBuilder.DropColumn(
                name: "xmin",
                schema: "operations",
                table: "alert_rules");

            migrationBuilder.DropColumn(
                name: "xmin",
                schema: "operations",
                table: "alert_instances");
        }
    }
}
