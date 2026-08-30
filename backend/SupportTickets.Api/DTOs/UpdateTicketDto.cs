namespace SupportTickets.Api.DTOs;

public sealed class UpdateTicketDto
{
    public string Status { get; set; } = string.Empty;
    public string? Resolution { get; set; }
}
