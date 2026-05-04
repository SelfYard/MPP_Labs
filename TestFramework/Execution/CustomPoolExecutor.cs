using System.Collections.Concurrent;
using System.Diagnostics;
using TestFramework.Core;
using TestFramework.Events;
using TestFramework.Threading;

namespace TestFramework.Execution
{
    public class CustomPoolExecutor : ITestExecutor
    {
        private readonly CustomThreadPool _pool;
        public CustomPoolExecutor(CustomThreadPool pool) => _pool = pool;

        public Task<List<TestResult>> ExecuteAsync(List<TestClassInfo> testClasses, CancellationToken ct = default)
        {
            var results = new ConcurrentBag<TestResult>();
            var allTests = FlattenTests(testClasses);

            if (allTests.Count == 0)
                return Task.FromResult(new List<TestResult>());

            var countdown = new CountdownEvent(allTests.Count);
            foreach (var (classInfo, instance, method, testName, parameters) in allTests)
            {
                var capturedInstance = instance;
                var capturedMethod = method;
                var capturedClass = classInfo;
                var capturedTestName = testName;
                var capturedParams = parameters;

                _pool.QueueUserWorkItem(() =>
                {
                    var result = new TestResult { ClassName = capturedClass.Type.Name, TestName = capturedTestName };
                    var sw = Stopwatch.StartNew();
                    try
                    {
                        if (capturedInstance is null) throw new InvalidOperationException("Test instance is null");
                        var task = capturedMethod.Method.Invoke(capturedInstance, capturedParams) as Task;
                        if (task != null)
                        {
                            if (capturedMethod.Timeout != null)
                                task.Wait(TimeSpan.FromMilliseconds(capturedMethod.Timeout.Milliseconds));
                            else
                                task.Wait(ct);
                        }
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
                        countdown.Signal();
                    }
                });
            }

            countdown.Wait(ct);
            return Task.FromResult(results.ToList());
        }

        private List<(TestClassInfo classInfo, object? instance, TestMethodInfo method,
                       string testName, object?[]? parameters)> FlattenTests(
            List<TestClassInfo> testClasses)
        {
            var flat = new List<(TestClassInfo, object?, TestMethodInfo, string, object?[]?)>();
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
                        flat.Add((classInfo, instance, method, testName, testCase.Parameters));
                    }
                }
            }
            return flat;
        }
    }
}