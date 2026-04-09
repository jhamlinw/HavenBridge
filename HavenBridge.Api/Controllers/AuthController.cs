using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Collections.Concurrent;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using HavenBridge.Api.Data;
using HavenBridge.Api.Models;
using HavenBridge.Api.Utils;

namespace HavenBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly HavenBridgeContext _db;
    private readonly IConfiguration _config;
    private static readonly ConcurrentDictionary<string, MfaChallenge> MfaChallenges = new();

    private sealed class MfaChallenge
    {
        public required int UserId { get; init; }
        public required string Email { get; init; }
        public required string Code { get; init; }
        public required DateTime ExpiresAtUtc { get; init; }
    }

    public AuthController(HavenBridgeContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private static string? ValidatePasswordStrength(string password)
    {
        if (password.Length < 14) return "Password must be at least 14 characters.";
        if (!Regex.IsMatch(password, "[A-Z]")) return "Password must contain an uppercase letter.";
        if (!Regex.IsMatch(password, "[a-z]")) return "Password must contain a lowercase letter.";
        if (!Regex.IsMatch(password, @"\d")) return "Password must contain a number.";
        if (!Regex.IsMatch(password, @"[^A-Za-z0-9]")) return "Password must contain a special character.";
        return null;
    }

    public record RegisterRequest(string Username, string Password, string? FirstName, string? LastName);
    public record LoginRequest(string Username, string Password);
    public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
    public record SendMfaCodeRequest(string Ticket, string Email);
    public record VerifyMfaRequest(string Ticket, string Email, string Code);

    [HttpPost("register")]
    public async Task<ActionResult> Register([FromBody] RegisterRequest req)
    {
        var normalizedUsername = InputSanitizer.Clean(req.Username, 100);
        if (string.IsNullOrWhiteSpace(normalizedUsername) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Username and password are required." });

        var pwError = ValidatePasswordStrength(req.Password);
        if (pwError != null)
            return BadRequest(new { message = pwError });

        var exists = await _db.Users.AnyAsync(u => u.Username == normalizedUsername);
        if (exists)
            return Conflict(new { message = "Username is already taken." });

        var donorRole = await _db.Roles.FirstOrDefaultAsync(r => r.RoleId == 3);
        if (donorRole == null)
            return StatusCode(500, new { message = "Required role data is missing (Donor role)." });

        var user = new User
        {
            RoleId = 3,
            SupporterId = null,
            Supporter = null,
            Username = normalizedUsername,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            UserFirstName = InputSanitizer.Clean(req.FirstName, 100),
            UserLastName = InputSanitizer.Clean(req.LastName, 100),
            IsSocialWorker = false,
            NeedPasswordReset = false
        };

        _db.Users.Add(user);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            var message = ex.InnerException?.Message ?? ex.Message;
            if (message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("unique", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = "Username is already taken." });
            }

            return StatusCode(500, new { message = "Unable to create user record.", detail = message });
        }

        string token;
        try
        {
            token = GenerateToken(user, donorRole.Description);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "User was created, but token generation failed.", detail = ex.Message });
        }

        return Ok(new
        {
            token,
            user = new { user.UserId, user.Username, user.UserFirstName, user.UserLastName, role = donorRole.Description, user.SupporterId }
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult> Login([FromBody] LoginRequest req)
    {
        var normalizedUsername = InputSanitizer.Clean(req.Username, 100);
        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Username == normalizedUsername);
        if (user == null)
            return Unauthorized(new { message = "Invalid username or password." });

        try
        {
            if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return Unauthorized(new { message = "Invalid username or password." });
        }
        catch
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        if (user.IsMfaEnabled)
        {
            var mfaTicket = GenerateMfaTicket(user);
            return Ok(new
            {
                needMfa = true,
                mfaTicket,
                needPasswordReset = user.NeedPasswordReset,
                user = new { user.UserId, user.Username, user.UserFirstName, user.UserLastName, role = user.Role!.Description, user.SupporterId }
            });
        }

        var token = GenerateToken(user, user.Role!.Description);

        return Ok(new
        {
            token,
            needMfa = false,
            needPasswordReset = user.NeedPasswordReset,
            user = new { user.UserId, user.Username, user.UserFirstName, user.UserLastName, role = user.Role.Description, user.SupporterId }
        });
    }

    [HttpPost("send-mfa-code")]
    public async Task<ActionResult> SendMfaCode([FromBody] SendMfaCodeRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Ticket) || string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(new { message = "MFA ticket and email are required." });

        var principal = ValidateMfaTicket(req.Ticket);
        if (principal == null)
            return Unauthorized(new { message = "MFA session is invalid or expired." });

        var userIdClaim = principal.FindFirstValue("mfa_user_id");
        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "MFA session is invalid." });

        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null || !user.IsMfaEnabled)
            return Unauthorized(new { message = "MFA is not enabled for this account." });

        var email = req.Email.Trim();
        if (!Regex.IsMatch(email, @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
            return BadRequest(new { message = "Please provide a valid email address." });

        var code = Random.Shared.Next(100000, 1000000).ToString();
        MfaChallenges[req.Ticket] = new MfaChallenge
        {
            UserId = userId,
            Email = email,
            Code = code,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10)
        };

        await SendMfaEmailAsync(email, code, user.Username);
        return Ok(new { message = "MFA code sent.", expiresInSeconds = 600 });
    }

    [HttpPost("verify-mfa")]
    public async Task<ActionResult> VerifyMfa([FromBody] VerifyMfaRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Ticket) || string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Code))
            return BadRequest(new { message = "MFA ticket, email, and code are required." });

        var principal = ValidateMfaTicket(req.Ticket);
        if (principal == null)
            return Unauthorized(new { message = "MFA session is invalid or expired." });

        var userIdClaim = principal.FindFirstValue("mfa_user_id");
        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "MFA session is invalid." });

        if (!MfaChallenges.TryGetValue(req.Ticket, out var challenge))
            return Unauthorized(new { message = "MFA code was not requested for this session." });

        if (challenge.ExpiresAtUtc < DateTime.UtcNow)
        {
            MfaChallenges.TryRemove(req.Ticket, out _);
            return Unauthorized(new { message = "MFA code has expired. Request a new code." });
        }

        if (!string.Equals(challenge.Email, req.Email.Trim(), StringComparison.OrdinalIgnoreCase))
            return Unauthorized(new { message = "MFA email does not match this session." });

        if (!string.Equals(challenge.Code, req.Code.Trim(), StringComparison.Ordinal))
            return Unauthorized(new { message = "Invalid MFA code." });

        if (challenge.UserId != userId)
            return Unauthorized(new { message = "MFA session mismatch." });

        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null)
            return Unauthorized(new { message = "User not found." });

        var token = GenerateToken(user, user.Role!.Description);
        MfaChallenges.TryRemove(req.Ticket, out _);

        return Ok(new
        {
            token,
            needMfa = false,
            needPasswordReset = user.NeedPasswordReset,
            user = new { user.UserId, user.Username, user.UserFirstName, user.UserLastName, role = user.Role.Description, user.SupporterId }
        });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        var user = await _db.Users.FindAsync(int.Parse(userIdClaim));
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect." });

        var newPwError = ValidatePasswordStrength(req.NewPassword);
        if (newPwError != null)
            return BadRequest(new { message = newPwError });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.NeedPasswordReset = false;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password changed successfully." });
    }

    public record CreateDonorProfileRequest(string? Email, string? Phone, string? Region, string? Country);

    [Authorize]
    [HttpPost("create-donor-profile")]
    public async Task<ActionResult> CreateDonorProfile([FromBody] CreateDonorProfileRequest? req)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == int.Parse(userIdClaim));
        if (user == null) return NotFound();
        if (user.SupporterId.HasValue)
            return Conflict(new { message = "Donor profile already exists." });

        var displayName = string.Join(" ",
            new[] { user.UserFirstName, user.UserLastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
        if (string.IsNullOrWhiteSpace(displayName))
            displayName = user.Username;

        var supporter = new Supporter
        {
            SupporterType = "Individual",
            DisplayName = displayName,
            FirstName = user.UserFirstName,
            LastName = user.UserLastName,
            Email = InputSanitizer.Clean(req?.Email, 200),
            Phone = InputSanitizer.Clean(req?.Phone, 50),
            Region = InputSanitizer.Clean(req?.Region, 100),
            Country = InputSanitizer.Clean(req?.Country, 100),
            Status = "Active",
            AcquisitionChannel = "Self-Registration",
            CreatedAt = DateTime.UtcNow
        };
        _db.Supporters.Add(supporter);
        await _db.SaveChangesAsync();

        user.SupporterId = supporter.SupporterId;
        await _db.SaveChangesAsync();

        var token = GenerateToken(user, user.Role!.Description);
        return Ok(new { token, supporterId = supporter.SupporterId });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult> Me()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == int.Parse(userIdClaim));
        if (user == null) return NotFound();

        return Ok(new
        {
            user.UserId,
            user.Username,
            user.UserFirstName,
            user.UserLastName,
            role = user.Role!.Description,
            user.SupporterId
        });
    }

    private string GenerateToken(User user, string role)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, role)
        };

        if (user.SupporterId.HasValue)
            claims.Add(new Claim("supporterId", user.SupporterId.Value.ToString()));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateMfaTicket(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim("mfa_user_id", user.UserId.ToString()),
            new Claim("mfa_required", "true")
        };

        var ticket = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(ticket);
    }

    private ClaimsPrincipal? ValidateMfaTicket(string ticket)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]!);
        try
        {
            return tokenHandler.ValidateToken(ticket, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _config["Jwt:Issuer"],
                ValidAudience = _config["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = TimeSpan.FromSeconds(30)
            }, out _);
        }
        catch
        {
            return null;
        }
    }

    private async Task SendMfaEmailAsync(string toEmail, string code, string username)
    {
        var host = _config["Smtp:Host"] ?? Environment.GetEnvironmentVariable("SMTP_HOST");
        var portRaw = _config["Smtp:Port"] ?? Environment.GetEnvironmentVariable("SMTP_PORT");
        var smtpUser = _config["Smtp:User"] ?? Environment.GetEnvironmentVariable("SMTP_USER");
        var smtpPass = _config["Smtp:Pass"] ?? Environment.GetEnvironmentVariable("SMTP_PASS");
        var from = _config["Smtp:From"] ?? Environment.GetEnvironmentVariable("SMTP_FROM");
        var sslRaw = _config["Smtp:EnableSsl"] ?? Environment.GetEnvironmentVariable("SMTP_ENABLE_SSL");

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
            throw new InvalidOperationException("SMTP settings are not configured.");

        var port = int.TryParse(portRaw, out var parsedPort) ? parsedPort : 587;
        var enableSsl = !string.IsNullOrWhiteSpace(sslRaw) && bool.TryParse(sslRaw, out var parsedSsl) ? parsedSsl : true;

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false
        };

        if (!string.IsNullOrWhiteSpace(smtpUser))
            client.Credentials = new NetworkCredential(smtpUser, smtpPass);

        using var mail = new MailMessage(from, toEmail)
        {
            Subject = "HavenBridge verification code",
            Body = $"Hello {username},\n\nYour verification code is: {code}\n\nIt expires in 10 minutes.",
            IsBodyHtml = false
        };

        await client.SendMailAsync(mail);
    }
}
