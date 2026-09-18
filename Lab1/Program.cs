using System.Reflection;
using TestRunner;

var assembly = typeof(App.Tests.SignalTests).Assembly;
var loader = new TestLoader();
var tests = loader.LoadTests(assembly);

var runner = new TestRunnerFacade(tests);
Console.WriteLine("=== Lab 1: Sequential execution ===");
await runner.RunSequentialAsync();
Console.WriteLine("Done.");

