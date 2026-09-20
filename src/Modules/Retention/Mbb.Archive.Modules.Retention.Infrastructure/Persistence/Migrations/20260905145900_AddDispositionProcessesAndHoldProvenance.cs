using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Retention.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDispositionProcessesAndHoldProvenance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "release_reason",
                schema: "retention",
                table: "legal_holds",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "released_by",
                schema: "retention",
                table: "legal_holds",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "disposition_processes",
                schema: "retention",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RetentionCaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CommissionReference = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    RequiredReviews = table.Column<int>(type: "integer", nullable: false),
                    ApprovedBy = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ApprovedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ApprovalReference = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CompletedBy = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReceivingArchive = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ReceiptReference = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ConcurrencyVersion = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_disposition_processes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_disposition_processes_cases_RetentionCaseId",
                        column: x => x.RetentionCaseId,
                        principalSchema: "retention",
                        principalTable: "cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "disposition_reviews",
                schema: "retention",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProcessId = table.Column<Guid>(type: "uuid", nullable: false),
                    Actor = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Approved = table.Column<bool>(type: "boolean", nullable: false),
                    Reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_disposition_reviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_disposition_reviews_disposition_processes_ProcessId",
                        column: x => x.ProcessId,
                        principalSchema: "retention",
                        principalTable: "disposition_processes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_disposition_processes_RetentionCaseId",
                schema: "retention",
                table: "disposition_processes",
                column: "RetentionCaseId",
                unique: true,
                filter: "\"Status\" NOT IN ('Rejected', 'Completed')");

            migrationBuilder.CreateIndex(
                name: "IX_disposition_processes_Status_CreatedAt",
                schema: "retention",
                table: "disposition_processes",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_disposition_reviews_ProcessId_Actor",
                schema: "retention",
                table: "disposition_reviews",
                columns: new[] { "ProcessId", "Actor" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "disposition_reviews",
                schema: "retention");

            migrationBuilder.DropTable(
                name: "disposition_processes",
                schema: "retention");

            migrationBuilder.DropColumn(
                name: "release_reason",
                schema: "retention",
                table: "legal_holds");

            migrationBuilder.DropColumn(
                name: "released_by",
                schema: "retention",
                table: "legal_holds");
        }
    }
}
