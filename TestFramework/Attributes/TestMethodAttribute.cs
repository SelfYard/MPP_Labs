namespace TestFramework.Attributes
{
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public class TestMethodAttribute : Attribute
    {
        public string? Description { get; set; }
        public string? Category { get; set; }
        public int Priority { get; set; } = 0;
        public string? Author { get; set; }
    }
}