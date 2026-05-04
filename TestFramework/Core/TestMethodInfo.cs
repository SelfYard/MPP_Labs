using System.Reflection;
using TestFramework.Attributes;

namespace TestFramework.Core
{
    public class TestMethodInfo
    {
        public MethodInfo Method { get; }
        public TestMethodAttribute Attribute { get; }
        public TimeoutAttribute? Timeout { get; }
        public TestParameterSourceAttribute? ParameterSource { get; }
        public List<TestCase> ParameterizedCases { get; } = new();

        public TestMethodInfo(MethodInfo method, TestMethodAttribute attr)
        {
            Method = method;
            Attribute = attr;
            Timeout = method.GetCustomAttribute<TimeoutAttribute>();
            ParameterSource = method.GetCustomAttribute<TestParameterSourceAttribute>();
        }

        public bool IsParameterized => ParameterSource != null;
    }
}