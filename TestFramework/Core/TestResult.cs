namespace TestFramework.Core
{
    public class TestResult
    {
        public string TestName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public bool Passed { get; set; }
        public string? Message { get; set; }
        public TimeSpan Duration { get; set; }
        public Exception? Exception { get; set; }
    }
}