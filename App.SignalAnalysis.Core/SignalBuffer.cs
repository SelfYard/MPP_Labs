using System;

namespace SignalAnalysis.Core
{
    public class SignalBuffer : IDisposable
    {
        private double[] _data;
        private bool _disposed;

        public double[] Data
        {
            get
            {
                if (_disposed)
                    throw new SignalBufferDisposedException();
                return _data;
            }
        }

        public SignalBuffer(int length)
        {
            if (length <= 0)
                throw new ArgumentOutOfRangeException(nameof(length), "Length must be positive.");
            _data = new double[length];
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _data = Array.Empty<double>(); // освобождаем ссылку на массив
                _disposed = true;
            }
        }
    }
}