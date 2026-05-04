namespace TestFramework.Attributes
{
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public class CleanupAttribute : Attribute { }
}