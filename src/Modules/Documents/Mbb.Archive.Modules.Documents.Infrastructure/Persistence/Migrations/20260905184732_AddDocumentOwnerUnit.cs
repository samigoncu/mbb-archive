using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Documents.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentOwnerUnit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "owner_unit_id",
                schema: "documents",
                table: "documents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "owner_unit_path",
                schema: "documents",
                table: "documents",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_documents_owner_unit_path",
                schema: "documents",
                table: "documents",
                column: "owner_unit_path");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_documents_owner_unit_path",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "owner_unit_id",
                schema: "documents",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "owner_unit_path",
                schema: "documents",
                table: "documents");
        }
    }
}
