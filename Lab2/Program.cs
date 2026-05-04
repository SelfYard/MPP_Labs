using System.Diagnostics;
using System.Reflection;
using TestRunner;

var assembly = typeof(App.Tests.SignalTests).Assembly;
var loader = new TestLoader();
var tests = loader.LoadTests(assembly);

var runner = new TestRunnerFacade(tests);

var swSeq = Stopwatch.StartNew();
await runner.RunSequentialAsync();
swSeq.Stop();
Console.WriteLine($"Sequential time: {swSeq.Elapsed}");

// Parallel timing
var swPar = Stopwatch.StartNew();
await runner.RunParallelAsync(4);
swPar.Stop();
Console.WriteLine($"Parallel time: {swPar.Elapsed}");

Console.WriteLine($"Parallel is {(swSeq.Elapsed > swPar.Elapsed ? "faster" : "slower")}");