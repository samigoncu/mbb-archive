using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SyncPhysicalArchiveModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sütunlar bazı ortamlara elle eklenmiş olabilir; varsa yalnız
            // model ile aynı kısıtlara getirilir. Aksi hâlde migration
            // "already exists" ile durur ve şema yarım kalırdı.
            migrationBuilder.Sql("""
                ALTER TABLE physical_archive.loans
                    ADD COLUMN IF NOT EXISTS checked_out_by character varying(300);

                UPDATE physical_archive.loans SET checked_out_by = ''
                 WHERE checked_out_by IS NULL;

                ALTER TABLE physical_archive.loans
                    ALTER COLUMN checked_out_by SET DEFAULT '',
                    ALTER COLUMN checked_out_by SET NOT NULL;

                ALTER TABLE physical_archive.loans
                    ADD COLUMN IF NOT EXISTS return_note character varying(1000);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "checked_out_by",
                schema: "physical_archive",
                table: "loans");

            migrationBuilder.DropColumn(
                name: "return_note",
                schema: "physical_archive",
                table: "loans");
        }
    }
}
