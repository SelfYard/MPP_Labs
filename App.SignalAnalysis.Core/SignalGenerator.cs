using System;
using System.Threading;
using System.Threading.Tasks;

namespace SignalAnalysis.Core
{
    public static class SignalGenerator
    {
        public static double[] GenerateSineWave(int sampleRate, double frequency, double durationSeconds, double amplitude = 1.0)
        {
            ValidateSignalParameters(sampleRate, frequency, durationSeconds);
            int totalSamples = (int)(sampleRate * durationSeconds);
            double[] signal = new double[totalSamples];
            double angularFrequency = 2 * Math.PI * frequency / sampleRate;

            for (int i = 0; i < totalSamples; i++)
            {
                signal[i] = amplitude * Math.Sin(angularFrequency * i);
            }
            return signal;
        }

        public static Task<double[]> GenerateSineWaveAsync(int sampleRate, double frequency, double durationSeconds, double amplitude = 1.0,
            CancellationToken cancellationToken = default)
        {
            ValidateSignalParameters(sampleRate, frequency, durationSeconds);
            return Task.Run(() =>
            {
                int totalSamples = (int)(sampleRate * durationSeconds);
                double[] signal = new double[totalSamples];
                double angularFrequency = 2 * Math.PI * frequency / sampleRate;

                for (int i = 0; i < totalSamples; i++)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    signal[i] = amplitude * Math.Sin(angularFrequency * i);
                }
                return signal;
            }, cancellationToken);
        }

        public static double[] GenerateCompositeSignal(int sampleRate, double[] frequencies, double[] amplitudes, double durationSeconds,
            double noiseStdDev = 0.0, int? seed = null)
        {
            ValidateCompositeParameters(sampleRate, frequencies, amplitudes, durationSeconds);
            int totalSamples = (int)(sampleRate * durationSeconds);
            double[] signal = new double[totalSamples];
            Random rng = seed.HasValue ? new Random(seed.Value) : new Random();

            for (int i = 0; i < totalSamples; i++)
            {
                double t = (double)i / sampleRate;
                double value = 0.0;
                for (int j = 0; j < frequencies.Length; j++)
                {
                    value += amplitudes[j] * Math.Sin(2 * Math.PI * frequencies[j] * t);
                }
                if (noiseStdDev > 0)
                {
                    value += GenerateGaussianNoise(rng) * noiseStdDev;
                }
                signal[i] = value;
            }
            return signal;
        }

        public static Task<double[]> GenerateCompositeSignalAsync(int sampleRate, double[] frequencies, double[] amplitudes,
            double durationSeconds, double noiseStdDev = 0.0, CancellationToken cancellationToken = default, int? seed = null)
        {
            ValidateCompositeParameters(sampleRate, frequencies, amplitudes, durationSeconds);
            return Task.Run(() =>
            {
                int totalSamples = (int)(sampleRate * durationSeconds);
                double[] signal = new double[totalSamples];
                Random rng = seed.HasValue ? new Random(seed.Value) : new Random();

                for (int i = 0; i < totalSamples; i++)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    double t = (double)i / sampleRate;
                    double value = 0.0;
                    for (int j = 0; j < frequencies.Length; j++)
                    {
                        value += amplitudes[j] * Math.Sin(2 * Math.PI * frequencies[j] * t);
                    }
                    if (noiseStdDev > 0)
                    {
                        value += GenerateGaussianNoise(rng) * noiseStdDev;
                    }
                    signal[i] = value;
                }
                return signal;
            }, cancellationToken);
        }

        private static void ValidateSignalParameters(int sampleRate, double frequency, double durationSeconds)
        {
            if (sampleRate <= 0)
                throw new InvalidSignalParametersException(nameof(sampleRate), "Sample rate must be positive.");
            if (durationSeconds <= 0)
                throw new InvalidSignalParametersException(nameof(durationSeconds), "Duration must be positive.");
            if (frequency < 0)
                throw new InvalidSignalParametersException(nameof(frequency), "Frequency must be non-negative.");
            if (frequency > sampleRate / 2.0)
                throw new InvalidSignalParametersException(nameof(frequency), "Frequency exceeds Nyquist limit.");
        }

        private static void ValidateCompositeParameters(int sampleRate, double[] frequencies, double[] amplitudes, double durationSeconds)
        {
            if (sampleRate <= 0)
                throw new InvalidSignalParametersException(nameof(sampleRate), "Sample rate must be positive.");
            if (durationSeconds <= 0)
                throw new InvalidSignalParametersException(nameof(durationSeconds), "Duration must be positive.");
            if (frequencies == null || amplitudes == null)
                throw new InvalidSignalParametersException("Frequencies and amplitudes must not be null.");
            if (frequencies.Length == 0 || frequencies.Length != amplitudes.Length)
                throw new InvalidSignalParametersException("Frequencies and amplitudes must have the same non-zero length.");

            for (int i = 0; i < frequencies.Length; i++)
            {
                if (frequencies[i] < 0)
                    throw new InvalidSignalParametersException($"frequencies[{i}]", "Frequency must be non-negative.");
                if (frequencies[i] > sampleRate / 2.0)
                    throw new InvalidSignalParametersException($"frequencies[{i}]", "Frequency exceeds Nyquist limit.");
            }
        }

        private static double GenerateGaussianNoise(Random rng)
        {
            // Box-Muller transform
            double u1 = 1.0 - rng.NextDouble();
            double u2 = 1.0 - rng.NextDouble();
            return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Sin(2.0 * Math.PI * u2);
        }
    }
}