using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.PhysicalArchive.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLocationTypeCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "type",
                schema: "physical_archive",
                table: "locations",
                type: "character varying(60)",
                maxLength: 60,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.CreateTable(
                name: "location_types",
                schema: "physical_archive",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    can_store_folder = table.Column<bool>(type: "boolean", nullable: false),
                    allows_capacity = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_built_in = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_location_types", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_location_types_code",
                schema: "physical_archive",
                table: "location_types",
                column: "code",
                unique: true);
        
            // Kurulumla gelen sekiz seviye. Kodlar eski enum adlarıyla birebir
            // olduğu için mevcut locations.type değerleri olduğu gibi geçerli.
            migrationBuilder.Sql("""
                insert into physical_archive.location_types
                    (id, code, name, level, can_store_folder, allows_capacity, is_active, is_built_in)
                values
                    (gen_random_uuid(), 'InstitutionArchive', 'Kurum Arşivi', 1, false, false, true, true),
                    (gen_random_uuid(), 'Building',           'Bina',         2, false, false, true, true),
                    (gen_random_uuid(), 'ArchiveArea',        'Arşiv Alanı',  3, false, false, true, true),
                    (gen_random_uuid(), 'Room',               'Arşiv Odası',  4, false, false, true, true),
                    (gen_random_uuid(), 'Aisle',              'Koridor',      5, false, false, true, true),
                    (gen_random_uuid(), 'Cabinet',            'Dolap',        6, false, false, true, true),
                    (gen_random_uuid(), 'Shelf',              'Raf',          7, true,  true,  true, true),
                    (gen_random_uuid(), 'Box',                'Kutu',         8, true,  true,  true, true)
                on conflict (code) do nothing;
                """);
}

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "location_types",
                schema: "physical_archive");

            migrationBuilder.AlterColumn<string>(
                name: "type",
                schema: "physical_archive",
                table: "locations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(60)",
                oldMaxLength: 60);
        }
    }
}
