using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Audit.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class StoreAuditPayloadAsText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bu göç öncesinde yazılmış satırların baytları jsonb tarafından
            // zaten normalize edilmişti; onların girdi hash'i geri
            // hesaplanamaz. Zincir bağları (previous_hash) bozulmaz, yalnızca
            // eski satırların hash doğrulaması "mismatch" olarak raporlanır.
            migrationBuilder.AlterColumn<string>(
                name: "payload",
                schema: "audit",
                table: "entries",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "jsonb");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "payload",
                schema: "audit",
                table: "entries",
                type: "jsonb",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
