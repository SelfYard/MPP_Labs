using System.Reflection;
using TestFramework.Attributes;

namespace TestFramework.Core
{
    public class TestClassInfo
    {
        public Type Type { get; }
        public TestClassAttribute ClassAttr { get; }
        public MethodInfo? SetupMethod { get; set; }
        public MethodInfo? CleanupMethod { get; set; }
        public List<TestMethodInfo> TestMethods { get; } = new();

        public TestClassInfo(Type type, TestClassAttribute classAttr)
        {
            Type = type;
            ClassAttr = classAttr;
        }

        public Type? SharedContextType { get; set; }
    }
}