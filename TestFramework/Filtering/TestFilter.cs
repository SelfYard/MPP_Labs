using TestFramework.Attributes;
using TestFramework.Core;

namespace TestFramework.Filtering
{
    public static class TestFilter
    {
        public static List<TestClassInfo> Apply(List<TestClassInfo> tests,
            Func<TestClassAttribute, TestMethodAttribute?, bool>? classFilter = null,
            Func<TestMethodAttribute, bool>? methodFilter = null)
        {
            var result = new List<TestClassInfo>();
            foreach (var classInfo in tests)
            {
                var filteredMethods = classInfo.TestMethods
                    .Where(m => methodFilter == null || methodFilter(m.Attribute))
                    .ToList();

                if (filteredMethods.Any() && (classFilter == null || classFilter(classInfo.ClassAttr, null)))
                {
                    var newClass = new TestClassInfo(classInfo.Type, classInfo.ClassAttr)
                    {
                        SetupMethod = classInfo.SetupMethod,
                        CleanupMethod = classInfo.CleanupMethod,
                        SharedContextType = classInfo.SharedContextType
                    };
                    newClass.TestMethods.AddRange(filteredMethods);
                    result.Add(newClass);
                }
            }
            return result;
        }
    }
}