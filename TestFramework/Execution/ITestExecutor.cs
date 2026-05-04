using TestFramework.Core;

namespace TestFramework.Execution
{
    public interface ITestExecutor
    {
        Task<List<TestResult>> ExecuteAsync(
            List<TestClassInfo> testClasses,
            CancellationToken cancellationToken = default);
    }
}