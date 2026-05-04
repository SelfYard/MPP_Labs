namespace TestFramework.Attributes
{
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public class TestParameterSourceAttribute : Attribute
    {
        public string SourceMethodName { get; }
        public TestParameterSourceAttribute(string sourceMethodName)
            => SourceMethodName = sourceMethodName;
    }
}