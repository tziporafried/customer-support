using System.Net.Mail;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SupportTickets.Api.Entities;

namespace SupportTickets.Api.Data;

public static class AdminSeeder
{
    public static async Task SeedAsync(
        IServiceProvider services,
        IConfiguration configuration)
    {
        var name = configuration["SeedAdmin:Name"];
        var email = configuration["SeedAdmin:Email"];
        var password = configuration["SeedAdmin:Password"];

        if (string.IsNullOrWhiteSpace(name) ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (!MailAddress.TryCreate(normalizedEmail, out var parsedEmail) ||
            !string.Equals(
                parsedEmail.Address,
                normalizedEmail,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("SeedAdmin:Email is not a valid email address.");
        }

        if (password.Length < 8)
        {
            throw new InvalidOperationException(
                "SeedAdmin:Password must be at least 8 characters long.");
        }

        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
        var logger = scope.ServiceProvider
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("AdminSeeder");

        var userExists = await dbContext.Users.AnyAsync(
            user => user.Email.ToLower() == normalizedEmail);

        if (userExists)
        {
            logger.LogInformation("Seed admin user already exists; no changes were made.");
            return;
        }

        var admin = new User
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Email = normalizedEmail,
            Role = "Admin",
            CreatedAt = DateTime.UtcNow
        };
        admin.PasswordHash = passwordHasher.HashPassword(admin, password);

        dbContext.Users.Add(admin);

        try
        {
            await dbContext.SaveChangesAsync();
            logger.LogInformation("Seed admin user was created.");
        }
        catch (DbUpdateException exception)
            when (exception.InnerException is PostgresException
                  { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            logger.LogInformation(
                "Seed admin user was created by another application instance; no changes were made.");
        }
    }
}
