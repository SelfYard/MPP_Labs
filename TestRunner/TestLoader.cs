using System.Reflection;
using TestFramework.Attributes;
using TestFramework.Core;

namespace TestRunner
{
    public class TestLoader
    {
        public List<TestClassInfo> LoadTests(Assembly assembly)
        {
            var testClasses = new List<TestClassInfo>();
            foreach (var type in assembly.GetTypes())
            {
                var classAttr = type.GetCustomAttribute<TestClassAttribute>();
                if (classAttr == null) continue;

                var classInfo = new TestClassInfo(type, classAttr);

                var sharedCtx = type.GetCustomAttribute<SharedContextAttribute>();
                if (sharedCtx != null)
                    classInfo.SharedContextType = sharedCtx.ContextType;

                classInfo.SetupMethod = type.GetMethods()
                    .FirstOrDefault(m => m.GetCustomAttribute<SetupAttribute>() != null);
                classInfo.CleanupMethod = type.GetMethods()
                    .FirstOrDefault(m => m.GetCustomAttribute<CleanupAttribute>() != null);

                foreach (var method in type.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static))
                {
                    var methodAttr = method.GetCustomAttribute<TestMethodAttribute>();
                    if (methodAttr == null) continue;

                    var methodInfo = new TestMethodInfo(method, methodAttr);

                    var paramSource = method.GetCustomAttribute<TestParameterSourceAttribute>();
                    if (paramSource != null)
                    {
                        var sourceMethod = type.GetMethod(paramSource.SourceMethodName,
                            BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance);
                        if (sourceMethod != null)
                        {
                            var instance = Activator.CreateInstance(type);
                            var enumerable = sourceMethod.Invoke(instance, null) as System.Collections.IEnumerable;
                            if (enumerable != null)
                            {
                                foreach (var args in enumerable)
                                {
                                    var argsArray = args as object[] ?? new object[] { args };
                                    methodInfo.ParameterizedCases.Add(new TestCase
                                    {
                                        Name = method.Name,
                                        Parameters = argsArray
                                    });
                                }
                            }
                        }
                    }

                    classInfo.TestMethods.Add(methodInfo);
                }

                testClasses.Add(classInfo);
            }
            return testClasses;
        }
    }
}