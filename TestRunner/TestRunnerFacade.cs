using System.Diagnostics;
using TestFramework.Core;
using TestFramework.Execution;
using TestFramework.Filtering;
using TestFramework.Threading;
using TestFramework.Attributes;   // <-- added missing using

namespace TestRunner
{
    public class TestRunnerFacade
    {
        private readonly List<TestClassInfo> _tests;

        public TestRunnerFacade(List<TestClassInfo> tests) => _tests = tests;

        public async Task RunSequentialAsync()
        {
            var exec = new SequentialExecutor();
            var results = await exec.ExecuteAsync(_tests);
            Logger.PrintResults(results);
        }

        public async Task RunParallelAsync(int maxDegree)
        {
            var exec = new ParallelExecutor { MaxDegreeOfParallelism = maxDegree };
            var sw = Stopwatch.StartNew();
            var results = await exec.ExecuteAsync(_tests);
            sw.Stop();
            Logger.PrintResults(results);
            Console.WriteLine($"Parallel execution time: {sw.Elapsed}");
        }

        public async Task RunWithCustomPoolAsync(CustomThreadPool pool)
        {
            var exec = new CustomPoolExecutor(pool);
            var results = await exec.ExecuteAsync(_tests);
            Logger.PrintResults(results);
        }

        public async Task RunFilteredAsync(
            Func<TestClassAttribute, TestMethodAttribute?, bool>? classFilter,
            Func<TestMethodAttribute, bool>? methodFilter)
        {
            var filtered = TestFilter.Apply(_tests, classFilter, methodFilter);
            var exec = new SequentialExecutor();
            var results = await exec.ExecuteAsync(filtered);
            Logger.PrintResults(results);
        }
    }
}