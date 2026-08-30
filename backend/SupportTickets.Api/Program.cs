using System.IdentityModel.Tokens.Jwt;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using SupportTickets.Api.Data;
using SupportTickets.Api.DTOs;
using SupportTickets.Api.Entities;
using SupportTickets.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SupportTickets.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SupportTickets.Frontend";
var jwtSigningKey = builder.Configuration["Jwt:SigningKey"]
    ?? throw new InvalidOperationException("Jwt:SigningKey is not configured.");
if (Encoding.UTF8.GetByteCount(jwtSigningKey) < 32)
{
    throw new InvalidOperationException("Jwt:SigningKey must be at least 32 bytes long.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
            RoleClaimType = ClaimTypes.Role,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection is not configured.");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<IEmailService, SmtpEmailService>();
builder.Services.AddHttpClient<IAiSummaryService, GeminiAiSummaryService>(client =>
    client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/v1beta/"));
builder.Services.AddSingleton<TicketService>();

var app = builder.Build();

await AdminSeeder.SeedAsync(app.Services, app.Configuration);

if (app.Environment.IsDevelopment())
{
    app.UseCors("Frontend");
}
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapPost("/api/auth/login", async Task<IResult> (
    LoginRequest request,
    AppDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration) =>
{
    var email = request.Email.Trim().ToLowerInvariant();
    var user = await dbContext.Users.SingleOrDefaultAsync(
        item => item.Email.ToLower() == email);

    if (user is null)
    {
        return Results.Unauthorized();
    }

    var passwordResult = passwordHasher.VerifyHashedPassword(
        user,
        user.PasswordHash,
        request.Password);

    if (passwordResult == PasswordVerificationResult.Failed)
    {
        return Results.Unauthorized();
    }

    var expiresMinutes = configuration.GetValue("Jwt:ExpiresMinutes", 60);
    var expiresAt = DateTime.UtcNow.AddMinutes(expiresMinutes);
    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new Claim(JwtRegisteredClaimNames.Email, user.Email),
        new Claim(ClaimTypes.Name, user.Name),
        new Claim(ClaimTypes.Role, user.Role)
    };
    var credentials = new SigningCredentials(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
        SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(
        issuer: jwtIssuer,
        audience: jwtAudience,
        claims: claims,
        expires: expiresAt,
        signingCredentials: credentials);

    return Results.Ok(new LoginResponse
    {
        Token = new JwtSecurityTokenHandler().WriteToken(token),
        ExpiresAt = expiresAt,
        User = new UserResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        }
    });
});
app.MapPost("/api/auth/register", async Task<IResult> (
    RegisterRequest request,
    AppDbContext dbContext,
    IPasswordHasher<User> passwordHasher) =>
{
    var name = request.Name.Trim();
    var email = request.Email.Trim().ToLowerInvariant();
    var validationErrors = new Dictionary<string, string[]>();

    if (string.IsNullOrWhiteSpace(name))
    {
        validationErrors[nameof(request.Name)] = ["Name is required."];
    }

    if (string.IsNullOrWhiteSpace(email))
    {
        validationErrors[nameof(request.Email)] = ["Email is required."];
    }
    else if (!MailAddress.TryCreate(email, out var parsedEmail) ||
             !string.Equals(parsedEmail.Address, email, StringComparison.OrdinalIgnoreCase))
    {
        validationErrors[nameof(request.Email)] = ["Enter a valid email address."];
    }

    if (string.IsNullOrWhiteSpace(request.Password))
    {
        validationErrors[nameof(request.Password)] = ["Password is required."];
    }
    else if (request.Password.Length < 8)
    {
        validationErrors[nameof(request.Password)] =
            ["Password must be at least 8 characters long."];
    }

    if (validationErrors.Count > 0)
    {
        return Results.ValidationProblem(validationErrors);
    }

    var emailExists = await dbContext.Users.AnyAsync(user => user.Email.ToLower() == email);
    if (emailExists)
    {
        return Results.Conflict(new { message = "A user with this email already exists." });
    }

    var user = new User
    {
        Id = Guid.NewGuid(),
        Name = name,
        Email = email,
        Role = "User",
        CreatedAt = DateTime.UtcNow
    };
    user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

    dbContext.Users.Add(user);

    try
    {
        await dbContext.SaveChangesAsync();
    }
    catch (DbUpdateException exception)
        when (exception.InnerException is PostgresException
              { SqlState: PostgresErrorCodes.UniqueViolation })
    {
        return Results.Conflict(new { message = "A user with this email already exists." });
    }

    var response = new UserResponse
    {
        Id = user.Id,
        Name = user.Name,
        Email = user.Email,
        Role = user.Role,
        CreatedAt = user.CreatedAt
    };

    return Results.Json(response, statusCode: StatusCodes.Status201Created);
});
app.MapGet("/api/tickets", async (string? status, string? search, TicketService ticketService) =>
    Results.Ok(await ticketService.GetTicketsAsync(status, search)));
app.MapGet("/api/tickets/{id:guid}", async Task<IResult> (Guid id, TicketService ticketService) =>
{
    var ticket = await ticketService.GetTicketByIdAsync(id);
    return ticket is null ? Results.NotFound() : Results.Ok(ticket);
});
app.MapPost("/api/tickets", async (CreateTicketDto dto, TicketService ticketService) =>
{
    var ticket = await ticketService.CreateTicketAsync(dto);
    return Results.Created($"/api/tickets/{ticket.Id}", ticket);
});
app.MapPut("/api/tickets/{id:guid}", async Task<IResult> (
    Guid id,
    UpdateTicketDto dto,
    TicketService ticketService) =>
{
    var ticket = await ticketService.UpdateTicketAsync(id, dto);
    return ticket is null ? Results.NotFound() : Results.Ok(ticket);
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

app.Run();
