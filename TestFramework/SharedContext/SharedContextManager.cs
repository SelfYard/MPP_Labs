namespace TestFramework.SharedContext
{
    public class SharedContextManager
    {
        private readonly Dictionary<Type, SharedContextBase> _instances = new();

        public T Get<T>() where T : SharedContextBase, new()
        {
            if (!_instances.TryGetValue(typeof(T), out var ctx))
            {
                ctx = new T();
                ctx.Initialize();
                _instances[typeof(T)] = ctx;
            }
            return (T)ctx;
        }

        public void CleanupAll()
        {
            foreach (var ctx in _instances.Values)
                ctx.Cleanup();
            _instances.Clear();
        }
    }
}