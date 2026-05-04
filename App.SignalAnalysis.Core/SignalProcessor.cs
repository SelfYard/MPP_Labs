using System;
using System.Threading;
using System.Threading.Tasks;

namespace SignalAnalysis.Core
{
    public static class SignalProcessor
    {
        public static double[] LowPassFilter(double[] signal, int sampleRate, double cutoffFrequency, int filterOrder = 100)
        {
            if (signal == null || signal.Length == 0)
                throw new FilterConfigurationException("Signal is null or empty.");
            if (sampleRate <= 0)
                throw new FilterConfigurationException("Sample rate must be positive.");
            if (cutoffFrequency <= 0 || cutoffFrequency >= sampleRate / 2.0)
                throw new FilterConfigurationException("Cutoff frequency must be between 0 and Nyquist frequency.");

            double[] kernel = DesignLowPassKernel(cutoffFrequency, sampleRate, filterOrder);

            int resultLength = signal.Length - filterOrder;
            if (resultLength <= 0)
                throw new FilterConfigurationException("Signal length must be greater than filter order.");
            double[] result = new double[resultLength];
            for (int i = 0; i < resultLength; i++)
            {
                double sum = 0.0;
                for (int j = 0; j <= filterOrder; j++)
                {
                    sum += kernel[j] * signal[i + j];
                }
                result[i] = sum;
            }
            return result;
        }

        public static Task<double[]> LowPassFilterAsync(double[] signal, int sampleRate, double cutoffFrequency,
            CancellationToken cancellationToken = default)
        {
            if (signal == null || signal.Length == 0)
                throw new FilterConfigurationException("Signal is null or empty.");
            if (sampleRate <= 0)
                throw new FilterConfigurationException("Sample rate must be positive.");
            if (cutoffFrequency <= 0 || cutoffFrequency >= sampleRate / 2.0)
                throw new FilterConfigurationException("Cutoff frequency must be between 0 and Nyquist frequency.");

            return Task.Run(() =>
            {
                cancellationToken.ThrowIfCancellationRequested();
                return LowPassFilter(signal, sampleRate, cutoffFrequency);
            }, cancellationToken);
        }

        private static double[] DesignLowPassKernel(double cutoff, int sampleRate, int order)
        {
            double[] kernel = new double[order + 1];
            double normalizedCutoff = 2.0 * cutoff / sampleRate;
            for (int n = 0; n <= order; n++)
            {
                if (n == order / 2)
                {
                    kernel[n] = normalizedCutoff;
                }
                else
                {
                    double x = Math.PI * normalizedCutoff * (n - order / 2.0);
                    kernel[n] = Math.Sin(x) / x;
                }
                kernel[n] *= 0.54 - 0.46 * Math.Cos(2.0 * Math.PI * n / order);
            }
            double sum = 0.0;
            for (int n = 0; n <= order; n++)
                sum += kernel[n];
            for (int n = 0; n <= order; n++)
                kernel[n] /= sum;

            return kernel;
        }
    }
}