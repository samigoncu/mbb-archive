using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PhysicalDispositionEvidence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "concurrency_version",
                schema: "physical_archive",
                table: "folders",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "disposed_at",
                schema: "physical_archive",
                table: "folder_documents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "disposed_by",
                schema: "physical_archive",
                table: "folder_documents",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "disposition_evidence_document_id",
                schema: "physical_archive",
                table: "folder_documents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "disposition_process_id",
                schema: "physical_archive",
                table: "folder_documents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "disposition_reference",
                schema: "physical_archive",
                table: "folder_documents",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "concurrency_version",
                schema: "physical_archive",
                table: "folders");

            migrationBuilder.DropColumn(
                name: "disposed_at",
                schema: "physical_archive",
                table: "folder_documents");

            migrationBuilder.DropColumn(
                name: "disposed_by",
                schema: "physical_archive",
                table: "folder_documents");

            migrationBuilder.DropColumn(
                name: "disposition_evidence_document_id",
                schema: "physical_archive",
                table: "folder_documents");

            migrationBuilder.DropColumn(
                name: "disposition_process_id",
                schema: "physical_archive",
                table: "folder_documents");

            migrationBuilder.DropColumn(
                name: "disposition_reference",
                schema: "physical_archive",
                table: "folder_documents");
        }
    }
}
