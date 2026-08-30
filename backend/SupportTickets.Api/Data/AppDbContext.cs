using Microsoft.EntityFrameworkCore;
using SupportTickets.Api.Entities;

namespace SupportTickets.Api.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var user = modelBuilder.Entity<User>();

        user.HasKey(item => item.Id);
        user.HasIndex(item => item.Email).IsUnique();
        user.Property(item => item.Name).IsRequired();
        user.Property(item => item.Email).IsRequired();
        user.Property(item => item.PasswordHash).IsRequired();
        user.Property(item => item.Role).IsRequired();
        user.Property(item => item.CreatedAt).IsRequired();
    }
}
