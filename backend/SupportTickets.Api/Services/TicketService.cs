using System.Text.Json;
using SupportTickets.Api.DTOs;
using SupportTickets.Api.Entities;

namespace SupportTickets.Api.Services;

public sealed class TicketService
{
    private readonly string _filePath;
    private readonly IEmailService _emailService;
    private readonly IAiSummaryService _aiSummaryService;
    private readonly string _frontendBaseUrl;
    private readonly ILogger<TicketService> _logger;

    public TicketService(
        IWebHostEnvironment environment,
        IEmailService emailService,
        IAiSummaryService aiSummaryService,
        IConfiguration configuration,
        ILogger<TicketService> logger)
    {
        _filePath = Path.Combine(environment.ContentRootPath, "Data", "tickets.json");
        _emailService = emailService;
        _aiSummaryService = aiSummaryService;
        _frontendBaseUrl = (configuration["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
        _logger = logger;
    }

    private string BuildTrackingUrl(Guid ticketId) => $"{_frontendBaseUrl}/tickets/{ticketId}";

    public async Task<List<Ticket>> GetTicketsAsync(string? status = null, string? search = null)
    {
        var json = await File.ReadAllTextAsync(_filePath);

        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        IEnumerable<Ticket> tickets = JsonSerializer.Deserialize<List<Ticket>>(json) ?? [];

        if (!string.IsNullOrWhiteSpace(status))
        {
            tickets = tickets.Where(ticket =>
                string.Equals(ticket.Status, status, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            tickets = tickets.Where(ticket =>
                ticket.FullName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                ticket.Description.Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        return tickets.ToList();
    }

    public async Task<Ticket?> GetTicketByIdAsync(Guid id)
    {
        var tickets = await GetTicketsAsync();
        return tickets.FirstOrDefault(ticket => ticket.Id == id);
    }

    public async Task<Ticket> CreateTicketAsync(CreateTicketDto dto)
    {
        var tickets = await GetTicketsAsync();
        var now = DateTime.UtcNow;
        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName,
            Email = dto.Email,
            Description = dto.Description,
            Status = "Open",
            Resolution = null,
            AiSummary = null,
            CreatedAt = now,
            UpdatedAt = now
        };

        try
        {
            ticket.AiSummary = await _aiSummaryService.GenerateSummaryAsync(ticket.Description);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "AI summary generation failed for ticket {TicketId}. Ticket creation will continue.",
                ticket.Id);
        }

        tickets.Add(ticket);
        await SaveTicketsAsync(tickets);
        await TrySendEmailAsync(
            ticket.Id,
            ticket.Email,
            $"Ticket {ticket.Id} created",
            $"Your ticket has been created. Ticket ID: {ticket.Id}. Track it at {BuildTrackingUrl(ticket.Id)}");

        return ticket;
    }

    public async Task<Ticket?> UpdateTicketAsync(Guid id, UpdateTicketDto dto)
    {
        var tickets = await GetTicketsAsync();
        var ticket = tickets.FirstOrDefault(ticket => ticket.Id == id);

        if (ticket is null)
        {
            return null;
        }

        var changes = new List<string>();

        if (!string.Equals(ticket.Status, dto.Status, StringComparison.Ordinal))
        {
            changes.Add($"Status changed from '{ticket.Status}' to '{dto.Status}'.");
        }

        if (!string.Equals(ticket.Resolution, dto.Resolution, StringComparison.Ordinal))
        {
            var resolutionText = string.IsNullOrWhiteSpace(dto.Resolution)
                ? "(cleared)"
                : dto.Resolution;
            changes.Add($"Resolution was updated: {resolutionText}");
        }

        ticket.Status = dto.Status;
        ticket.Resolution = dto.Resolution;
        ticket.UpdatedAt = DateTime.UtcNow;

        await SaveTicketsAsync(tickets);

        if (changes.Count > 0)
        {
            await TrySendEmailAsync(
                ticket.Id,
                ticket.Email,
                $"Ticket {ticket.Id} updated",
                string.Join(Environment.NewLine, changes));
        }

        return ticket;
    }

    public async Task<bool> DeleteTicketAsync(Guid id)
    {
        var tickets = await GetTicketsAsync();
        var ticket = tickets.FirstOrDefault(ticket => ticket.Id == id);

        if (ticket is null)
        {
            return false;
        }

        tickets.Remove(ticket);
        await SaveTicketsAsync(tickets);

        return true;
    }

    private async Task SaveTicketsAsync(List<Ticket> tickets)
    {
        var json = JsonSerializer.Serialize(tickets, new JsonSerializerOptions
        {
            WriteIndented = true
        });
        await File.WriteAllTextAsync(_filePath, json);
    }

    private async Task TrySendEmailAsync(Guid ticketId, string to, string subject, string message)
    {
        try
        {
            await _emailService.SendEmailAsync(to, subject, message);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Failed to send notification email for ticket {TicketId}. Ticket data was already saved.",
                ticketId);
        }
    }
}
