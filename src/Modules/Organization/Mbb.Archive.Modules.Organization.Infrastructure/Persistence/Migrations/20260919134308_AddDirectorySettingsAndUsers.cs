using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mbb.Archive.Modules.Organization.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDirectorySettingsAndUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "directory_settings",
                schema: "organization",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    host = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    port = table.Column<int>(type: "integer", nullable: false),
                    use_ssl = table.Column<bool>(type: "boolean", nullable: false),
                    bind_dn = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    bind_password_cipher = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    user_search_base = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    unit_search_base = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    user_filter = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    unit_filter = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    unit_attribute = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    group_attribute = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    display_name_attribute = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    mail_attribute = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    timeout_seconds = table.Column<int>(type: "integer", nullable: false),
                    provision_on_login = table.Column<bool>(type: "boolean", nullable: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    updated_by = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_directory_settings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "directory_users",
                schema: "organization",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    subject_id = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    display_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    email = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    title = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    unit_reference = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    source = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_synced_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    last_seen_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_directory_users", x => x.id);
                });

            migrationBuilder.InsertData(
                schema: "organization",
                table: "directory_settings",
                columns: new[] { "id", "bind_dn", "bind_password_cipher", "display_name_attribute", "group_attribute", "host", "is_enabled", "mail_attribute", "port", "provision_on_login", "timeout_seconds", "unit_attribute", "unit_filter", "unit_search_base", "updated_at", "updated_by", "use_ssl", "user_filter", "user_search_base", "version" },
                values: new object[] { 1, "", null, "displayName", "memberOf", "", false, "mail", 636, true, 20, "department", "(objectClass=organizationalUnit)", "", null, "system", true, "(&(objectClass=user)(sAMAccountName={0}))", "", 1L });

            migrationBuilder.CreateIndex(
                name: "IX_directory_users_subject_id",
                schema: "organization",
                table: "directory_users",
                column: "subject_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "directory_settings",
                schema: "organization");

            migrationBuilder.DropTable(
                name: "directory_users",
                schema: "organization");
        }
    }
}
