using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Operations.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SyncOperationsModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sütun bazı ortamlara elle eklenmiş olabilir; varsa atlanır.
            migrationBuilder.Sql(
                "ALTER TABLE operations.branding ADD COLUMN IF NOT EXISTS department_name character varying(200);");

            // Kurum kimliği yönetim ekranından yönetilir; tohum değerini
            // geriye dönük yazmak yöneticinin girdiği adı sessizce ezerdi.
            // Yalnız hiç doldurulmamış alan tamamlanır.
            migrationBuilder.Sql("""
                UPDATE operations.branding
                   SET department_name = 'Yazı İşleri ve Kararlar Dairesi Başkanlığı · Arşiv Şube Müdürlüğü'
                 WHERE id = 1 AND department_name IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "department_name",
                schema: "operations",
                table: "branding");

            migrationBuilder.UpdateData(
                schema: "operations",
                table: "branding",
                keyColumn: "id",
                keyValue: 1,
                column: "institution_name",
                value: "Malatya Büyükşehir Belediyesi");
        }
    }
}
