namespace SchoolAdmission.Api.Common;

public class AdmissionOptions
{
    public int HoldDurationSeconds { get; init; } = 600;
    public int ExpirySweepIntervalSeconds { get; init; } = 5;

    public TimeSpan HoldDuration => TimeSpan.FromSeconds(HoldDurationSeconds);
    public TimeSpan ExpirySweepInterval => TimeSpan.FromSeconds(ExpirySweepIntervalSeconds);

    public static AdmissionOptions FromConfiguration(IConfiguration configuration)
    {
        var holdSeconds = configuration.GetValue("HOLD_DURATION_SECONDS", 600);
        var sweepSeconds = configuration.GetValue("EXPIRY_SWEEP_INTERVAL_SECONDS", 5);

        if (holdSeconds <= 0)
            throw new InvalidOperationException("HOLD_DURATION_SECONDS must be a positive number of seconds.");
        if (sweepSeconds <= 0)
            throw new InvalidOperationException("EXPIRY_SWEEP_INTERVAL_SECONDS must be a positive number of seconds.");

        return new AdmissionOptions { HoldDurationSeconds = holdSeconds, ExpirySweepIntervalSeconds = sweepSeconds };
    }
}
