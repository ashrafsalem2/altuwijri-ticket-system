using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketCategorySupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Remove timing fields no longer used
            migrationBuilder.DropColumn(name: "DueDate",        table: "Tasks");
            migrationBuilder.DropColumn(name: "SlaDueDate",     table: "Tasks");
            migrationBuilder.DropColumn(name: "EstimatedHours", table: "Tasks");
            migrationBuilder.DropColumn(name: "ActualHours",    table: "Tasks");

            // Create TicketCategories table
            migrationBuilder.CreateTable(
                name: "TicketCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name        = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Icon        = table.Column<string>(type: "nvarchar(20)",  maxLength: 20,  nullable: false, defaultValue: "🎫"),
                    Color       = table.Column<string>(type: "nvarchar(20)",  maxLength: 20,  nullable: false, defaultValue: "#3b82f6"),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive    = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt   = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt   = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedById = table.Column<int>(type: "int", nullable: true),
                    UpdatedById = table.Column<int>(type: "int", nullable: true),
                    IsDeleted   = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketCategories", x => x.Id);
                });

            // Add CategoryId FK columns
            migrationBuilder.AddColumn<int>(name: "CategoryId", table: "Tasks", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "CategoryId", table: "Users", type: "int", nullable: true);

            // Indexes
            migrationBuilder.CreateIndex(name: "IX_Tasks_CategoryId", table: "Tasks", column: "CategoryId");
            migrationBuilder.CreateIndex(name: "IX_Users_CategoryId", table: "Users", column: "CategoryId");

            // Foreign keys
            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_TicketCategories_CategoryId",
                table: "Tasks", column: "CategoryId",
                principalTable: "TicketCategories", principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_TicketCategories_CategoryId",
                table: "Users", column: "CategoryId",
                principalTable: "TicketCategories", principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_Tasks_TicketCategories_CategoryId", table: "Tasks");
            migrationBuilder.DropForeignKey(name: "FK_Users_TicketCategories_CategoryId", table: "Users");
            migrationBuilder.DropIndex(name: "IX_Tasks_CategoryId", table: "Tasks");
            migrationBuilder.DropIndex(name: "IX_Users_CategoryId", table: "Users");
            migrationBuilder.DropColumn(name: "CategoryId", table: "Tasks");
            migrationBuilder.DropColumn(name: "CategoryId", table: "Users");
            migrationBuilder.DropTable(name: "TicketCategories");

            migrationBuilder.AddColumn<DateTime>(name: "DueDate",        table: "Tasks", type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<DateTime>(name: "SlaDueDate",     table: "Tasks", type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<decimal>(name: "EstimatedHours",  table: "Tasks", type: "decimal(8,2)", precision: 8, scale: 2, nullable: true);
            migrationBuilder.AddColumn<decimal>(name: "ActualHours",     table: "Tasks", type: "decimal(8,2)", precision: 8, scale: 2, nullable: true);
        }
    }
}
