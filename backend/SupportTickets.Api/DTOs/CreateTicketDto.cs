namespace SupportTickets.Api.DTOs;

public sealed class CreateTicketDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
