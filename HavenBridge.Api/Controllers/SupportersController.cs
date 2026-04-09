using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HavenBridge.Api.Data;
using HavenBridge.Api.Models;
using HavenBridge.Api.Utils;

namespace HavenBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SupportersController : ControllerBase
{
    private readonly HavenBridgeContext _db;
    public SupportersController(HavenBridgeContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.Supporters
            .Include(s => s.Donations)
            .OrderBy(s => s.DisplayName);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { items, totalCount, page, pageSize });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Supporter>> Get(int id)
    {
        var supporter = await _db.Supporters
            .Include(s => s.Donations.OrderByDescending(d => d.DonationDate))
                .ThenInclude(d => d.Allocations)
            .FirstOrDefaultAsync(s => s.SupporterId == id);

        return supporter is null ? NotFound() : Ok(supporter);
    }

    [HttpPost]
    public async Task<ActionResult<Supporter>> Create(Supporter supporter)
    {
        supporter.SupporterType = InputSanitizer.Clean(supporter.SupporterType, 50);
        supporter.DisplayName = InputSanitizer.Clean(supporter.DisplayName, 200) ?? string.Empty;
        supporter.OrganizationName = InputSanitizer.Clean(supporter.OrganizationName, 200);
        supporter.FirstName = InputSanitizer.Clean(supporter.FirstName, 100);
        supporter.LastName = InputSanitizer.Clean(supporter.LastName, 100);
        supporter.RelationshipType = InputSanitizer.Clean(supporter.RelationshipType, 100);
        supporter.Region = InputSanitizer.Clean(supporter.Region, 100);
        supporter.Country = InputSanitizer.Clean(supporter.Country, 100);
        supporter.Email = InputSanitizer.Clean(supporter.Email, 200);
        supporter.Phone = InputSanitizer.Clean(supporter.Phone, 50);
        supporter.Status = InputSanitizer.Clean(supporter.Status, 50);
        supporter.AcquisitionChannel = InputSanitizer.Clean(supporter.AcquisitionChannel, 100);

        supporter.CreatedAt = DateTime.UtcNow;
        _db.Supporters.Add(supporter);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = supporter.SupporterId }, supporter);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Dictionary<string, object?> updates)
    {
        var existing = await _db.Supporters.FindAsync(id);
        if (existing is null) return NotFound();

        var type = typeof(Supporter);
        foreach (var (key, value) in updates)
        {
            var prop = type.GetProperties()
                .FirstOrDefault(p => string.Equals(p.Name, key, StringComparison.OrdinalIgnoreCase));
            if (prop == null || !prop.CanWrite) continue;

            object? converted = value;
            if (value is System.Text.Json.JsonElement je)
            {
                if (prop.PropertyType == typeof(string) || prop.PropertyType == typeof(string))
                    converted = InputSanitizer.Clean(je.GetString(), 4000);
                else if (prop.PropertyType == typeof(int) || prop.PropertyType == typeof(int?))
                    converted = je.TryGetInt32(out var i) ? i : null;
                else if (prop.PropertyType == typeof(bool))
                    converted = je.GetBoolean();
                else
                    converted = je.ToString();
            }
            if (converted is string s) converted = InputSanitizer.Clean(s, 4000);
            prop.SetValue(existing, converted);
        }

        await _db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpPut("{id}/flag-at-risk")]
    public async Task<IActionResult> FlagAtRisk(int id)
    {
        var supporter = await _db.Supporters.FindAsync(id);
        if (supporter is null) return NotFound();
        supporter.Status = supporter.Status == "At-Risk" ? "Active" : "At-Risk";
        await _db.SaveChangesAsync();
        return Ok(supporter);
    }

    [HttpGet("summary")]
    public async Task<ActionResult> GetSummary()
    {
        var total = await _db.Supporters.CountAsync();
        var active = await _db.Supporters.CountAsync(s => s.Status == "Active");
        var atRisk = await _db.Supporters.CountAsync(s => s.Status == "At-Risk");
        var avgGift = await _db.Donations
            .Where(d => d.Amount > 0)
            .AverageAsync(d => (double?)d.Amount) ?? 0;

        return Ok(new { total, active, atRisk, avgGift = Math.Round(avgGift, 2) });
    }
}
