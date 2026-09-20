using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CompleteArchiveLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CommissionConfiguredBy",
                schema: "retention",
                table: "disposition_processes",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CommissionValidFrom",
                schema: "retention",
                table: "disposition_processes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CommissionValidUntil",
                schema: "retention",
                table: "disposition_processes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ExecutionEvidenceDocumentId",
                schema: "retention",
                table: "disposition_processes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExecutionEvidenceSha256",
                schema: "retention",
                table: "disposition_processes",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ExecutionEvidenceVersionId",
                schema: "retention",
                table: "disposition_processes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExecutionLocation",
                schema: "retention",
                table: "disposition_processes",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExecutionMethod",
                schema: "retention",
                table: "disposition_processes",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExecutionWitnesses",
                schema: "retention",
                table: "disposition_processes",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PackageCreatedAt",
                schema: "retention",
                table: "disposition_processes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PackageCreatedBy",
                schema: "retention",
                table: "disposition_processes",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PackageVerifiedAt",
                schema: "retention",
                table: "disposition_processes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PackageVerifiedBy",
                schema: "retention",
                table: "disposition_processes",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PhysicalExecutedAt",
                schema: "retention",
                table: "disposition_processes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransferManifestJson",
                schema: "retention",
                table: "disposition_processes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransferManifestSha256",
                schema: "retention",
                table: "disposition_processes",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TransferPackageId",
                schema: "retention",
                table: "disposition_processes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransferPackageSha256",
                schema: "retention",
                table: "disposition_processes",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "TransferPackageSize",
                schema: "retention",
                table: "disposition_processes",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "DigitalPreservationRequired",
                schema: "retention",
                table: "cases",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "commission_members",
                schema: "retention",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProcessId = table.Column<Guid>(type: "uuid", nullable: false),
                    Subject = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    DelegateSubject = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    DelegationReference = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    DelegateFrom = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DelegateUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_commission_members", x => x.Id);
                    table.ForeignKey(
                        name: "FK_commission_members_disposition_processes_ProcessId",
                        column: x => x.ProcessId,
                        principalSchema: "retention",
                        principalTable: "disposition_processes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_commission_members_ProcessId_Subject",
                schema: "retention",
                table: "commission_members",
                columns: new[] { "ProcessId", "Subject" },
                unique: true);
            // Legacy administrative destruction never deleted originals. Preserve digital protection
            // without inventing physical execution evidence or changing the historical process record.
            migrationBuilder.Sql("""
                UPDATE retention.cases AS c SET "DigitalPreservationRequired" = TRUE,
                    action = 'KeepPermanent', due_at = NULL,
                    status = CASE WHEN active_hold_count > 0 THEN 'Held' ELSE 'Scheduled' END
                WHERE EXISTS (SELECT 1 FROM retention.disposition_processes p
                    WHERE p."RetentionCaseId" = c.id AND p."Action" = 'Destroy' AND p."Status" = 'Completed');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "commission_members",
                schema: "retention");

            migrationBuilder.DropColumn(
                name: "CommissionConfiguredBy",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "CommissionValidFrom",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "CommissionValidUntil",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "ExecutionEvidenceDocumentId",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "ExecutionEvidenceSha256",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "ExecutionEvidenceVersionId",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "ExecutionLocation",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "ExecutionMethod",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "ExecutionWitnesses",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "PackageCreatedAt",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "PackageCreatedBy",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "PackageVerifiedAt",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "PackageVerifiedBy",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "PhysicalExecutedAt",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "TransferManifestJson",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "TransferManifestSha256",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "TransferPackageId",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "TransferPackageSha256",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "TransferPackageSize",
                schema: "retention",
                table: "disposition_processes");

            migrationBuilder.DropColumn(
                name: "DigitalPreservationRequired",
                schema: "retention",
                table: "cases");
        }
    }
}
