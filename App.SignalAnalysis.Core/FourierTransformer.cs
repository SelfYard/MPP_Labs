using System;
using System.Numerics;
using System.Threading;
using System.Threading.Tasks;

namespace SignalAnalysis.Core
{
    public static class FourierTransformer
    {
        public static Complex[] ComputeFft(double[] samples)
        {
            if (samples == null)
                throw new FftSizeException("Input samples array is null.");
            if (samples.Length == 0)
                throw new FftSizeException("Input samples array is empty.");

            int n = samples.Length;
            int fftSize = 1;
            while (fftSize < n) fftSize <<= 1;

            Complex[] buffer = new Complex[fftSize];
            for (int i = 0; i < n; i++)
                buffer[i] = new Complex(samples[i], 0);

            Fft(buffer, fftSize);

            Complex[] result = new Complex[n];
            Array.Copy(buffer, result, n);
            return result;
        }

        public static Task<Complex[]> ComputeFftAsync(double[] samples, CancellationToken cancellationToken = default)
        {
            if (samples == null)
                throw new FftSizeException("Input samples array is null.");
            if (samples.Length == 0)
                throw new FftSizeException("Input samples array is empty.");

            return Task.Run(() => ComputeFft(samples), cancellationToken);
        }

        private static void Fft(Complex[] buffer, int n)
        {
            for (int i = 1, j = 0; i < n; i++)
            {
                int bit = n >> 1;
                for (; j >= bit; bit >>= 1)
                    j -= bit;
                j += bit;
                if (i < j)
                {
                    Complex temp = buffer[i];
                    buffer[i] = buffer[j];
                    buffer[j] = temp;
                }
            }

            for (int length = 2; length <= n; length <<= 1)
            {
                double angle = -2.0 * Math.PI / length;
                Complex wlen = new Complex(Math.Cos(angle), Math.Sin(angle));
                for (int i = 0; i < n; i += length)
                {
                    Complex w = Complex.One;
                    for (int j = 0; j < length / 2; j++)
                    {
                        Complex u = buffer[i + j];
                        Complex v = buffer[i + j + length / 2] * w;
                        buffer[i + j] = u + v;
                        buffer[i + j + length / 2] = u - v;
                        w *= wlen;
                    }
                }
            }
        }
    }
}