namespace TestFramework.Attributes
{
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
    public class TestClassAttribute : Attribute
    {
        public string? Category { get; set; }
        public int Priority { get; set; } = 0;
        public string? Author { get; set; }
    }
}