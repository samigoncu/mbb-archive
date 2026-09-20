using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Organization.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationUnitTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "type_code",
                schema: "organization",
                table: "units",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "unit_types",
                schema: "organization",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    can_hold_members = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_built_in = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_unit_types", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_units_type",
                schema: "organization",
                table: "units",
                column: "type_code");

            migrationBuilder.CreateIndex(
                name: "ux_unit_types_code",
                schema: "organization",
                table: "unit_types",
                column: "code",
                unique: true);

            // Kurulumla gelen seviyeler. Kurum kendi teşkilatına göre ekler,
            // yeniden adlandırır ya da pasife alır.
            migrationBuilder.Sql("""
                INSERT INTO organization.unit_types (id, code, name, level, can_hold_members, is_active, is_built_in)
                VALUES
                    (gen_random_uuid(), 'Institution',        'Kurum',             1, false, true, true),
                    (gen_random_uuid(), 'ExecutiveOffice',    'Başkanlık Makamı',  2, true,  true, true),
                    (gen_random_uuid(), 'GeneralSecretariat', 'Genel Sekreterlik', 2, true,  true, true),
                    (gen_random_uuid(), 'Directorate',        'Daire Başkanlığı',  3, true,  true, true),
                    (gen_random_uuid(), 'Advisory',           'Müşavirlik',        3, true,  true, true),
                    (gen_random_uuid(), 'Branch',             'Şube Müdürlüğü',    4, true,  true, true),
                    (gen_random_uuid(), 'Service',            'Servis',            5, true,  true, true),
                    (gen_random_uuid(), 'Office',             'Büro',              6, true,  true, true)
                ON CONFLICT (code) DO NOTHING;
                """);

            // Var olan birimlere seviye atanır.
            //
            // Kalıp bugüne kadar yalnız birim adının içinde yaşadığı için tek
            // kaynak odur. Yalnız tereddütsüz kalıplar eşleştirilir; şüpheli
            // olan hiçbir satıra dokunulmaz ve NULL kalır. Bu bir etikettir,
            // yanlış eşleşme veri kaybettirmez ve yönetim ekranından tek tıkla
            // düzeltilir — ama eşleştirme yapılmasaydı yirmi altı birimin
            // tamamı elle gezilmek zorunda kalırdı.
            migrationBuilder.Sql("""
                UPDATE organization.units SET type_code = CASE
                    WHEN depth = 0                                THEN 'Institution'
                    WHEN name ILIKE '%Başkanlık Makamı%'          THEN 'ExecutiveOffice'
                    WHEN name ILIKE '%Genel Sekreter%'            THEN 'GeneralSecretariat'
                    -- "Daire" ile "Başkanlığı" arasına iyelik eki girer:
                    -- "Bilgi İşlem Daire<b>si</b> Başkanlığı". Araya joker
                    -- konmazsa hiçbir daire başkanlığı eşleşmez.
                    WHEN name ILIKE '%Daire%Başkanlığı%'          THEN 'Directorate'
                    WHEN name ILIKE '%Müşavirli%'                 THEN 'Advisory'
                    WHEN name ILIKE '%Şube Müdürlüğü%'            THEN 'Branch'
                    WHEN name ILIKE '%Servis%'                    THEN 'Service'
                    ELSE NULL
                END
                WHERE type_code IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "unit_types",
                schema: "organization");

            migrationBuilder.DropIndex(
                name: "ix_units_type",
                schema: "organization",
                table: "units");

            migrationBuilder.DropColumn(
                name: "type_code",
                schema: "organization",
                table: "units");
        }
    }
}
