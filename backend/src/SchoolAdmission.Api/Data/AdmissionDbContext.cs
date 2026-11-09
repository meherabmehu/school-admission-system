using Microsoft.EntityFrameworkCore;

namespace SchoolAdmission.Api.Data;

public class AdmissionDbContext(DbContextOptions<AdmissionDbContext> options) : DbContext(options)
{
    public DbSet<SchoolClass> Classes => Set<SchoolClass>();
    public DbSet<SeatHold> Holds => Set<SeatHold>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SchoolClass>(entity =>
        {
            entity.ToTable("classes", t => t.HasCheckConstraint("ck_classes_total_seats_positive", "total_seats > 0"));
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("id").HasMaxLength(32);
            entity.Property(c => c.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(c => c.NormalizedName).HasColumnName("normalized_name").HasMaxLength(100).IsRequired();
            entity.Property(c => c.TotalSeats).HasColumnName("total_seats");
            entity.Property(c => c.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(c => c.NormalizedName).IsUnique();
        });

        modelBuilder.Entity<SeatHold>(entity =>
        {
            entity.ToTable("seat_holds");
            entity.HasKey(h => h.Id);
            entity.Property(h => h.Id).HasColumnName("id").HasMaxLength(32);
            entity.Property(h => h.ClassId).HasColumnName("class_id").HasMaxLength(32).IsRequired();
            entity.Property(h => h.StudentId).HasColumnName("student_id").HasMaxLength(17).IsRequired();
            entity.Property(h => h.Status).HasColumnName("status").HasMaxLength(16).IsRequired();
            entity.Property(h => h.CreatedAt).HasColumnName("created_at");
            entity.Property(h => h.ExpiresAt).HasColumnName("expires_at");
            entity.Property(h => h.ConfirmedAt).HasColumnName("confirmed_at");
            entity.Property(h => h.CancelledAt).HasColumnName("cancelled_at");

            entity.HasOne(h => h.Class)
                .WithMany(c => c.Holds)
                .HasForeignKey(h => h.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(h => new { h.ClassId, h.Status });
            entity.HasIndex(h => h.StudentId);
            entity.HasIndex(h => new { h.Status, h.ExpiresAt });

            // A student can have at most one active (held or confirmed) application per class.
            entity.HasIndex(h => new { h.ClassId, h.StudentId })
                .IsUnique()
                .HasFilter("status IN ('HELD', 'CONFIRMED')")
                .HasDatabaseName("ux_seat_holds_active_student_per_class");
        });
    }
}
