using System.Diagnostics;
using TestFramework.Core;
using TestFramework.Events;

namespace TestFramework.Execution
{
    public class SequentialExecutor : ITestExecutor
    {
        public async Task<List<TestResult>> ExecuteAsync(List<TestClassInfo> testClasses, CancellationToken ct = default)
        {
            var results = new List<TestResult>();
            foreach (var classInfo in testClasses)
            {
                object? instance = Activator.CreateInstance(classInfo.Type);
                if (classInfo.SharedContextType is not null)
                {
                    var sharedContext = Activator.CreateInstance(classInfo.SharedContextType);
                    var ctxProp = classInfo.Type.GetProperty("SharedContext");
                    ctxProp?.SetValue(instance, sharedContext);
                }

                try
                {
                    classInfo.SetupMethod?.Invoke(instance, null);
                }
                catch { /* setup failure not counted as test failure */ }

                foreach (var testMethod in classInfo.TestMethods)
                {
                    var cases = testMethod.IsParameterized
                        ? testMethod.ParameterizedCases
                        : new List<TestCase> { new TestCase { Name = testMethod.Method.Name, Parameters = null } };

                    foreach (var testCase in cases)
                    {
                        var testName = testMethod.IsParameterized
                            ? $"{testMethod.Method.Name}({string.Join(", ", testCase.Parameters ?? Array.Empty<object>())})"
                            : testMethod.Method.Name;

                        var result = new TestResult { ClassName = classInfo.Type.Name, TestName = testName };
                        var sw = Stopwatch.StartNew();
                        try
                        {
                            await InvokeTestMethod(instance!, testMethod, testCase.Parameters, ct);
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
                    }
                }

                try
                {
                    classInfo.CleanupMethod?.Invoke(instance, null);
                }
                catch { /* cleanup failure ignored */ }
            }
            return results;
        }

        private static async Task InvokeTestMethod(
            object instance, TestMethodInfo method, object?[]? parameters, CancellationToken ct)
        {
            var task = method.Method.Invoke(instance, parameters) as Task;
            if (task != null)
            {
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
}