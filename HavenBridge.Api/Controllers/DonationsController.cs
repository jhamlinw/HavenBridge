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
public class DonationsController : ControllerBase
{
    private readonly HavenBridgeContext _db;
    public DonationsController(HavenBridgeContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Donation>>> GetAll([FromQuery] int? supporterId)
    {
        var query = _db.Donations.Include(d => d.Supporter).AsQueryable();
        if (supporterId.HasValue)
            query = query.Where(d => d.SupporterId == supporterId.Value);

        return await query.OrderByDescending(d => d.DonationDate).ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Donation>> Create(Donation donation)
    {
        donation.DonationType = InputSanitizer.Clean(donation.DonationType, 50);
        donation.CampaignName = InputSanitizer.Clean(donation.CampaignName, 200);
        donation.ChannelSource = InputSanitizer.Clean(donation.ChannelSource, 100);
        donation.CurrencyCode = InputSanitizer.Clean(donation.CurrencyCode, 10) ?? "PHP";
        donation.ImpactUnit = InputSanitizer.Clean(donation.ImpactUnit, 100);
        donation.Notes = InputSanitizer.Clean(donation.Notes, 1000);

        if (donation.Amount < 0) return BadRequest(new { message = "Donation amount cannot be negative." });

        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();
        return CreatedAtAction(null, new { id = donation.DonationId }, donation);
    }
}
