namespace SupportTickets.Api.Services;

public sealed class MockEmailService(ILogger<MockEmailService> logger) : IEmailService
{
    public Task SendEmailAsync(string to, string subject, string message)
    {
        logger.LogInformation(
            "===== Mock Email =====\nRecipient: {Recipient}\nSubject: {Subject}\nMessage: {Message}\n=======================",
            to,
            subject,
            message);

        return Task.CompletedTask;
    }
}
