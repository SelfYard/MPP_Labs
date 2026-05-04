using System.Reflection;
using TestFramework.Attributes;
using TestFramework.Events;
using TestFramework.Threading;
using TestRunner;

var assembly = typeof(App.Tests.SignalTests).Assembly;
var loader = new TestLoader();
var tests = loader.LoadTests(assembly);

TestEventBus.TestCompleted += r =>
    Console.WriteLine($"[Event] {r.ClassName}.{r.TestName}: {(r.Passed ? "PASS" : "FAIL")}");

var runner = new TestRunnerFacade(tests);
Console.WriteLine("=== Lab 4: Filtered (Category=Signal, Priority>=1) parameterized + custom pool ===");
await runner.RunFilteredAsync(
    classFilter: (c, _) => c.Category == "Signal" && c.Priority >= 1,
    methodFilter: null);

// Also run with custom pool and all tests
using var pool = new CustomThreadPool(2, 4);
Console.WriteLine("\n=== Lab 4: All tests with custom pool ===");
await runner.RunWithCustomPoolAsync(pool);