using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HavenBridge.Api.Data;
using HavenBridge.Api.Models;
using HavenBridge.Api.Utils;

namespace HavenBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class ResidentsController : ControllerBase
{
    private readonly HavenBridgeContext _db;
    public ResidentsController(HavenBridgeContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.Residents
            .Include(r => r.Safehouse)
            .OrderBy(r => r.CaseStatus == "Active" ? 0 : 1)
            .ThenByDescending(r => r.DateOfAdmission);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { items, totalCount, page, pageSize });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Resident>> Get(int id)
    {
        var resident = await _db.Residents
            .Include(r => r.Safehouse)
            .Include(r => r.ProcessRecordings.OrderByDescending(p => p.SessionDate))
            .Include(r => r.InterventionPlans)
            .Include(r => r.HomeVisitations.OrderByDescending(h => h.VisitDate))
            .Include(r => r.HealthRecords.OrderByDescending(h => h.RecordDate))
            .Include(r => r.EducationRecords.OrderByDescending(e => e.RecordDate))
            .Include(r => r.IncidentReports.OrderByDescending(i => i.IncidentDate))
            .AsSplitQuery()
            .FirstOrDefaultAsync(r => r.ResidentId == id);

        return resident is null ? NotFound() : Ok(resident);
    }

    [HttpPost]
    public async Task<ActionResult<Resident>> Create(Resident resident)
    {
        resident.CaseControlNo = InputSanitizer.Clean(resident.CaseControlNo, 100);
        resident.InternalCode = InputSanitizer.Clean(resident.InternalCode, 100);
        resident.CaseStatus = InputSanitizer.Clean(resident.CaseStatus, 50);
        resident.Sex = InputSanitizer.Clean(resident.Sex, 20);
        resident.BirthStatus = InputSanitizer.Clean(resident.BirthStatus, 50);
        resident.PlaceOfBirth = InputSanitizer.Clean(resident.PlaceOfBirth, 200);
        resident.Religion = InputSanitizer.Clean(resident.Religion, 100);
        resident.CaseCategory = InputSanitizer.Clean(resident.CaseCategory, 100);
        resident.PwdType = InputSanitizer.Clean(resident.PwdType, 100);
        resident.SpecialNeedsDiagnosis = InputSanitizer.Clean(resident.SpecialNeedsDiagnosis, 300);
        resident.AgeUponAdmission = InputSanitizer.Clean(resident.AgeUponAdmission, 50);
        resident.PresentAge = InputSanitizer.Clean(resident.PresentAge, 50);
        resident.LengthOfStay = InputSanitizer.Clean(resident.LengthOfStay, 100);
        resident.ReferralSource = InputSanitizer.Clean(resident.ReferralSource, 200);
        resident.ReferringAgencyPerson = InputSanitizer.Clean(resident.ReferringAgencyPerson, 200);
        resident.AssignedSocialWorker = InputSanitizer.Clean(resident.AssignedSocialWorker, 100);
        resident.InitialCaseAssessment = InputSanitizer.Clean(resident.InitialCaseAssessment, 4000);
        resident.ReintegrationType = InputSanitizer.Clean(resident.ReintegrationType, 100);
        resident.ReintegrationStatus = InputSanitizer.Clean(resident.ReintegrationStatus, 100);
        resident.InitialRiskLevel = InputSanitizer.Clean(resident.InitialRiskLevel, 50);
        resident.CurrentRiskLevel = InputSanitizer.Clean(resident.CurrentRiskLevel, 50);

        resident.CreatedAt = DateTime.UtcNow;

        if (resident.DateOfBirth.HasValue)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var dob = resident.DateOfBirth.Value;
            int years = today.Year - dob.Year;
            int months = today.Month - dob.Month;
            if (today.Day < dob.Day) months--;
            if (months < 0) { years--; months += 12; }
            resident.PresentAge = $"{years} Years {months} months";
            resident.AgeUponAdmission = resident.PresentAge;
        }

        _db.Residents.Add(resident);
        await _db.SaveChangesAsync();

        var maxCode = await _db.Residents
            .Where(r => r.InternalCode != null && r.InternalCode.StartsWith("LS-"))
            .Select(r => r.InternalCode!)
            .OrderByDescending(c => c)
            .FirstOrDefaultAsync();
        var nextNum = 1;
        if (maxCode != null && int.TryParse(maxCode.AsSpan(3), out var parsed))
            nextNum = parsed + 1;
        resident.InternalCode = $"LS-{nextNum:D4}";
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Dictionary<string, object?> updates)
    {
        var existing = await _db.Residents.FindAsync(id);
        if (existing is null) return NotFound();

        var props = typeof(Resident).GetProperties()
            .Where(p => p.CanWrite)
            .ToDictionary(p => p.Name, p => p, StringComparer.OrdinalIgnoreCase);

        foreach (var kv in updates)
        {
            if (!props.TryGetValue(kv.Key, out var prop) || kv.Key.Equals("ResidentId", StringComparison.OrdinalIgnoreCase))
                continue;

            if (kv.Value is null)
            {
                prop.SetValue(existing, null);
                continue;
            }

            var target = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
            if (kv.Value is System.Text.Json.JsonElement je)
            {
                var converted = System.Text.Json.JsonSerializer.Deserialize(je.GetRawText(), target);
                if (converted is string s)
                    converted = InputSanitizer.Clean(s, 4000);
                prop.SetValue(existing, converted);
            }
            else
            {
                object? converted = Convert.ChangeType(kv.Value, target);
                if (converted is string s)
                    converted = InputSanitizer.Clean(s, 4000);
                prop.SetValue(existing, converted);
            }
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var resident = await _db.Residents.FindAsync(id);
        if (resident is null) return NotFound();

        var recordings = _db.ProcessRecordings.Where(p => p.ResidentId == id);
        var plans = _db.InterventionPlans.Where(p => p.ResidentId == id);
        var visitations = _db.HomeVisitations.Where(v => v.ResidentId == id);
        var healthRecords = _db.HealthWellbeingRecords.Where(h => h.ResidentId == id);
        var educationRecords = _db.EducationRecords.Where(e => e.ResidentId == id);
        var incidents = _db.IncidentReports.Where(i => i.ResidentId == id);

        _db.ProcessRecordings.RemoveRange(recordings);
        _db.InterventionPlans.RemoveRange(plans);
        _db.HomeVisitations.RemoveRange(visitations);
        _db.HealthWellbeingRecords.RemoveRange(healthRecords);
        _db.EducationRecords.RemoveRange(educationRecords);
        _db.IncidentReports.RemoveRange(incidents);
        _db.Residents.Remove(resident);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Resident and related records deleted successfully." });
    }

    [HttpGet("alerts")]
    public async Task<ActionResult> GetAlerts()
    {
        var highRisk = await _db.Residents
            .Where(r => r.CurrentRiskLevel == "High" && r.CaseStatus == "Active")
            .Select(r => new { r.ResidentId, r.InternalCode, r.CurrentRiskLevel, r.AssignedSocialWorker, Type = "High Risk" })
            .ToListAsync();

        var flaggedSessions = await _db.ProcessRecordings
            .Where(p => p.ConcernsFlagged)
            .OrderByDescending(p => p.SessionDate)
            .Take(10)
            .Select(p => new { p.RecordingId, p.ResidentId, p.SessionDate, p.SessionType, Type = "Concern Flagged" })
            .ToListAsync();

        var unresolvedIncidents = await _db.IncidentReports
            .Where(i => !i.Resolved)
            .OrderByDescending(i => i.IncidentDate)
            .Select(i => new { i.IncidentId, i.ResidentId, i.IncidentDate, i.Severity, i.IncidentType, Type = "Unresolved Incident" })
            .ToListAsync();

        return Ok(new { highRisk, flaggedSessions, unresolvedIncidents });
    }
}
