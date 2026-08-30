using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace SupportTickets.Api.Services;

public sealed class SmtpEmailService(
    IConfiguration configuration,
    ILogger<SmtpEmailService> logger) : IEmailService
{
    public async Task SendEmailAsync(string to, string subject, string message)
    {
        var host = configuration["Email:SmtpHost"]
            ?? throw new InvalidOperationException("Email:SmtpHost is not configured.");
        var port = configuration.GetValue<int?>("Email:SmtpPort")
            ?? throw new InvalidOperationException("Email:SmtpPort is not configured.");
        var username = configuration["Email:Username"]
            ?? throw new InvalidOperationException("Email:Username is not configured.");
        var password = configuration["Email:Password"]
            ?? throw new InvalidOperationException("Email:Password is not configured.");
        var fromEmail = configuration["Email:FromEmail"]
            ?? throw new InvalidOperationException("Email:FromEmail is not configured.");
        var fromName = configuration["Email:FromName"] ?? fromEmail;

        var mimeMessage = new MimeMessage();
        mimeMessage.From.Add(new MailboxAddress(fromName, fromEmail));
        mimeMessage.To.Add(MailboxAddress.Parse(to));
        mimeMessage.Subject = subject;
        mimeMessage.Body = new TextPart("plain") { Text = message };

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(username, password);
        await client.SendAsync(mimeMessage);
        await client.DisconnectAsync(true);

        logger.LogInformation(
            "Email sent via SMTP to {Recipient}. Subject: {Subject}",
            to,
            subject);
    }
}
