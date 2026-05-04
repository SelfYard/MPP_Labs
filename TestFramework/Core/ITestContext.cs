namespace TestFramework.Core
{
    public interface ITestContext
    {
        object? SharedContext { get; set; }
    }
}