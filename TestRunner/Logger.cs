using TestFramework.Core;

namespace TestRunner
{
    public static class Logger
    {
        private static readonly object _lock = new();
        public static void PrintResults(List<TestResult> results)
        {
            lock (_lock)
            {
                foreach (var r in results)
                {
                    var status = r.Passed ? "PASS" : "FAIL";
                    Console.WriteLine($"[{status}] {r.ClassName}.{r.TestName} ({r.Duration.TotalMilliseconds:F1} ms)");
                    if (!r.Passed && r.Message != null)
                        Console.WriteLine($"\tError: {r.Message}");
                }
            }
        }

        public static void LogToFile(List<TestResult> results, string path)
        {
            lock (_lock)
            {
                using var writer = new StreamWriter(path, append: false);
                foreach (var r in results)
                {
                    writer.WriteLine($"{r.Passed},{r.ClassName},{r.TestName},{r.Duration.TotalMilliseconds},{r.Message}");
                }
            }
        }
    }
}