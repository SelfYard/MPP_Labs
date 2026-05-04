namespace TestFramework.Attributes
{
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
    public class SharedContextAttribute : Attribute
    {
        public Type ContextType { get; }
        public SharedContextAttribute(Type contextType) => ContextType = contextType;
    }
}