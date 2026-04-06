using Microsoft.EntityFrameworkCore;
using HavenBridge.Api.Models;

namespace HavenBridge.Api.Data;

public class HavenBridgeContext : DbContext
{
    public HavenBridgeContext(DbContextOptions<HavenBridgeContext> options) : base(options) { }

    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<IncidentReport>()
            .HasOne(ir => ir.Resident)
            .WithMany(r => r.IncidentReports)
            .HasForeignKey(ir => ir.ResidentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<IncidentReport>()
            .HasOne(ir => ir.Safehouse)
            .WithMany(s => s.IncidentReports)
            .HasForeignKey(ir => ir.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DonationAllocation>()
            .HasOne(da => da.Safehouse)
            .WithMany(s => s.DonationAllocations)
            .HasForeignKey(da => da.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
