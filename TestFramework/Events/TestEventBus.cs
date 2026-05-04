using TestFramework.Core;

namespace TestFramework.Events
{
    public static class TestEventBus
    {
        public static event Action<TestResult>? TestCompleted;
        public static event Action<Exception, string>? ErrorOccurred;
        public static event Action<string>? Info;

        public static void RaiseTestCompleted(TestResult result) => TestCompleted?.Invoke(result);
        public static void RaiseError(Exception ex, string context) => ErrorOccurred?.Invoke(ex, context);
        public static void RaiseInfo(string message) => Info?.Invoke(message);
    }
}