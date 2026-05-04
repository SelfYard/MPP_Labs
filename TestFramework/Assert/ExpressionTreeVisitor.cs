using System.Linq.Expressions;

namespace TestFramework.Assert
{
    internal class ExpressionTreeVisitor : ExpressionVisitor
    {
        private readonly Stack<string> _stack = new();

        public string Explain(Expression expression)
        {
            Visit(expression);
            return _stack.Count > 0 ? _stack.Pop() : "expression";
        }

        protected override Expression VisitBinary(BinaryExpression node)
        {
            Visit(node.Left);
            var left = _stack.Pop();
            Visit(node.Right);
            var right = _stack.Pop();
            _stack.Push($"({left} {GetOperator(node.NodeType)} {right})");
            return node;
        }

        protected override Expression VisitConstant(ConstantExpression node)
        {
            _stack.Push(node.Value?.ToString() ?? "null");
            return node;
        }

        protected override Expression VisitMember(MemberExpression node)
        {
            if (node.Expression is ConstantExpression constExpr)
            {
                var container = constExpr.Value;
                var value = node.Member switch
                {
                    System.Reflection.FieldInfo fi => fi.GetValue(container),
                    System.Reflection.PropertyInfo pi => pi.GetValue(container),
                    _ => "?"
                };
                _stack.Push(value?.ToString() ?? "null");
            }
            else
            {
                _stack.Push(node.Member.Name);
            }
            return node;
        }

        protected override Expression VisitMethodCall(MethodCallExpression node)
        {
            _stack.Push($"{node.Method.Name}(...)");
            return node;
        }

        private static string GetOperator(ExpressionType type) => type switch
        {
            ExpressionType.Equal => "==",
            ExpressionType.NotEqual => "!=",
            ExpressionType.GreaterThan => ">",
            ExpressionType.LessThan => "<",
            ExpressionType.GreaterThanOrEqual => ">=",
            ExpressionType.LessThanOrEqual => "<=",
            ExpressionType.AndAlso => "&&",
            ExpressionType.OrElse => "||",
            _ => type.ToString()
        };
    }
}