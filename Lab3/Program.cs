using TestFramework.Threading;
using TestRunner;

var assembly = typeof(App.Tests.SignalTests).Assembly;
var loader = new TestLoader();
var tests = loader.LoadTests(assembly);

using var pool = new CustomThreadPool(2, 8, idleTimeoutMs: 2000);

pool.ThreadCreated += (s, e) => Console.WriteLine($"[Pool] Created: {e.Message}");
pool.ThreadDestroyed += (s, e) => Console.WriteLine($"[Pool] Destroyed: {e.Message}");
pool.WorkItemQueued += (s, e) => Console.WriteLine($"[Pool] Queued: {e.Message}");

var runner = new TestRunnerFacade(tests);

Console.WriteLine("=== Lab 3: Running 55 test cycles with custom pool ===");
for (int i = 0; i < 55; i++)
{
    await runner.RunWithCustomPoolAsync(pool);
    Console.WriteLine($"Cycle {i+1} completed. Queue size: {pool.QueueCount}, Active threads: {pool.ActiveThreadCount}");
}

Console.WriteLine("All cycles done. Pool will dispose idle threads.");