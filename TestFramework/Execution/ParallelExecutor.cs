using System.Collections.Concurrent;
using System.Diagnostics;
using TestFramework.Core;
using TestFramework.Events;

namespace TestFramework.Execution
{
    public class ParallelExecutor : ITestExecutor
    {
        public int MaxDegreeOfParallelism { get; set; } = Environment.ProcessorCount;

        public async Task<List<TestResult>> ExecuteAsync(List<TestClassInfo> testClasses, CancellationToken ct = default)
        {
            var results = new ConcurrentBag<TestResult>();
            var options = new ParallelOptions
            {
                MaxDegreeOfParallelism = MaxDegreeOfParallelism,
                CancellationToken = ct
            };

            var allTests = new List<(
                TestClassInfo classInfo,
                object? instance,
                TestMethodInfo method,
                string testName,
                object?[]? parameters)>();

            foreach (var classInfo in testClasses)
            {
                object? instance = Activator.CreateInstance(classInfo.Type);
                if (classInfo.SharedContextType != null)
                {
                    var sharedContext = Activator.CreateInstance(classInfo.SharedContextType);
                    classInfo.Type.GetProperty("SharedContext")?.SetValue(instance, sharedContext);
                }
                classInfo.SetupMethod?.Invoke(instance, null);

                foreach (var method in classInfo.TestMethods)
                {
                    var cases = method.IsParameterized
                        ? method.ParameterizedCases
                        : new List<TestCase> { new TestCase { Name = method.Method.Name, Parameters = null } };

                    foreach (var testCase in cases)
                    {
                        var testName = method.IsParameterized
                            ? $"{method.Method.Name}({string.Join(", ", testCase.Parameters ?? Array.Empty<object>())})"
                            : method.Method.Name;
                        allTests.Add((classInfo, instance, method, testName, testCase.Parameters));
                    }
                }
            }

            await Parallel.ForEachAsync(allTests, options, async (item, ct) =>
            {
                var (classInfo, instance, method, testName, parameters) = item;
                var result = new TestResult { ClassName = classInfo.Type.Name, TestName = testName };
                var sw = Stopwatch.StartNew();
                try
                {
                    await InvokeWithTimeout(instance!, method, parameters, ct);
                    result.Passed = true;
                }
                catch (Exception ex)
                {
                    result.Passed = false;
                    result.Exception = ex;
                    result.Message = ex.Message;
                }
                finally
                {
                    sw.Stop();
                    result.Duration = sw.Elapsed;
                    results.Add(result);
                    TestEventBus.RaiseTestCompleted(result);
                }
            });

            return results.ToList();
        }

        private async Task InvokeWithTimeout(
            object instance, TestMethodInfo method, object?[]? parameters, CancellationToken ct)
        {
            var task = method.Method.Invoke(instance, parameters) as Task;
            if (task == null) return;

            if (method.Timeout != null)
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(method.Timeout.Milliseconds);
                await task.WaitAsync(cts.Token);
            }
            else
            {
                await task.WaitAsync(ct);
            }
        }
    }
}