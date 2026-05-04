using System.Linq.Expressions;

namespace TestFramework.Assert
{
    public static class Assert
    {
        public class AssertionException : Exception
        {
            public AssertionException(string message) : base(message) { }
        }

        public static void AreEqual<T>(T expected, T actual, string? message = null)
        {
            if (!EqualityComparer<T>.Default.Equals(expected, actual))
                throw new AssertionException(message ?? $"Expected: '{expected}', Actual: '{actual}'");
        }

        public static void AreNotEqual<T>(T expected, T actual, string? message = null)
        {
            if (EqualityComparer<T>.Default.Equals(expected, actual))
                throw new AssertionException(message ?? $"Expected not equal to '{expected}'");
        }

        public static void IsTrue(bool condition, string? message = null)
        {
            if (!condition)
                throw new AssertionException(message ?? "Condition is false");
        }

        public static void IsFalse(bool condition, string? message = null)
        {
            if (condition)
                throw new AssertionException(message ?? "Condition is true");
        }

        public static void IsNull(object? obj, string? message = null)
        {
            if (obj != null)
                throw new AssertionException(message ?? $"Expected null, but was '{obj}'");
        }

        public static void IsNotNull(object? obj, string? message = null)
        {
            if (obj == null)
                throw new AssertionException(message ?? "Expected non-null value");
        }

        public static void ThrowsException<TException>(Action action, string? message = null) where TException : Exception
        {
            try
            {
                action();
            }
            catch (TException)
            {
                return;
            }
            catch (Exception ex)
            {
                throw new AssertionException(message ?? $"Expected exception of type {typeof(TException).Name}, but got {ex.GetType().Name}");
            }
            throw new AssertionException(message ?? $"Expected exception of type {typeof(TException).Name} was not thrown");
        }

        public static async Task ThrowsExceptionAsync<TException>(Func<Task> action, string? message = null) where TException : Exception
        {
            try
            {
                await action();
            }
            catch (TException)
            {
                return;
            }
            catch (Exception ex)
            {
                throw new AssertionException(message ?? $"Expected exception of type {typeof(TException).Name}, but got {ex.GetType().Name}");
            }
            throw new AssertionException(message ?? $"Expected exception of type {typeof(TException).Name} was not thrown");
        }

        public static void Fail(string message) => throw new AssertionException(message);

        public static void GreaterThan<T>(T value, T threshold, string? message = null) where T : IComparable<T>
        {
            if (value.CompareTo(threshold) <= 0)
                throw new AssertionException(message ?? $"{value} is not greater than {threshold}");
        }

        public static void LessThan<T>(T value, T threshold, string? message = null) where T : IComparable<T>
        {
            if (value.CompareTo(threshold) >= 0)
                throw new AssertionException(message ?? $"{value} is not less than {threshold}");
        }

        public static void InRange<T>(T value, T min, T max, string? message = null) where T : IComparable<T>
        {
            if (value.CompareTo(min) < 0 || value.CompareTo(max) > 0)
                throw new AssertionException(message ?? $"{value} is not in range [{min}, {max}]");
        }

        public static void Contains<T>(IEnumerable<T> collection, T item, string? message = null)
        {
            if (!collection.Contains(item))
                throw new AssertionException(message ?? $"Collection does not contain {item}");
        }

        public static void That(Expression<Func<bool>> predicate, string? message = null)
        {
            var compiled = predicate.Compile();
            if (compiled())
                return;

            var visitor = new ExpressionTreeVisitor();
            var details = visitor.Explain(predicate.Body);
            throw new AssertionException(message ?? $"Assert.That failed: {details}");
        }
    }
}