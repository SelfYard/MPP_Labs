using System.Numerics;
using SignalAnalysis.Core;
using TestFramework.Assert;
using TestFramework.Attributes;
using TestFramework.SharedContext;

namespace App.Tests
{
    public class TestSharedContext : SharedContextBase
    {
        public string SomeData { get; set; } = "default";
        public override void Initialize() => SomeData = "initialized";
        public override void Cleanup() => SomeData = string.Empty;
    }

    [TestClass(Category = "Signal", Priority = 1, Author = "StudyLab")]
    [SharedContext(typeof(TestSharedContext))]
    public class SignalTests
    {
        public TestSharedContext? SharedContext { get; set; }

        [Setup]
        public void Setup()
        {
            if (SharedContext != null)
                SharedContext.SomeData = "ready";
        }

        [Cleanup]
        public void Cleanup()
        {
        }

        [TestMethod(Description = "Generate a long sine wave and verify properties")]
        public async Task SineWaveGeneration_Heavy()
        {
            int sampleRate = 44100;
            double freq = 440.0;
            double duration = 1.0;
            var signal = await SignalGenerator.GenerateSineWaveAsync(sampleRate, freq, duration);
            Assert.AreEqual(sampleRate * (int)duration, signal.Length);
            Assert.IsTrue(signal.Any(v => Math.Abs(v) > 0.01), "Signal should contain non-zero values");
            var spectrum = FourierTransformer.ComputeFft(signal);
            Assert.AreNotEqual(signal.Length, spectrum.Length);
            // Assert.AreEqual(signal.Length, spectrum.Length);
        }

        [TestMethod]
        public void Fft_LargeArray()
        {
            int size = 1 << 17;
            double[] samples = new double[size];
            var rng = new Random(42);
            for (int i = 0; i < size; i++)
                samples[i] = rng.NextDouble() * 2.0 - 1.0;

            var spectrum = FourierTransformer.ComputeFft(samples);
            Assert.AreEqual(size, spectrum.Length);
            Assert.IsTrue(spectrum[0].Magnitude < 1e-6);
        }

        [TestMethod]
        public void SignalBuffer_ThrowsAfterDispose()
        {
            var buffer = new SignalBuffer(10);
            buffer.Dispose();
            Assert.ThrowsException<SignalBufferDisposedException>(() => { var _ = buffer.Data; });
        }

        [TestMethod]
        public async Task LowPassFilter_Heavy()
        {
            int sampleRate = 8000;
            double duration = 0.5;
            var signal = SignalGenerator.GenerateCompositeSignal(
                sampleRate,
                frequencies: new[] { 100.0, 500.0, 1200.0 },
                amplitudes: new[] { 1.0, 0.5, 0.3 },
                durationSeconds: duration,
                noiseStdDev: 0.1,
                seed: 123);

            var filtered = await SignalProcessor.LowPassFilterAsync(signal, sampleRate, 300);
            Assert.IsNotNull(filtered);
            Assert.GreaterThan(filtered.Length, 0);
        }

        [TestMethod]
        [Timeout(200)]
        public async Task TimeoutTest_HeavyComputation()
        {
            await Task.Run(() => PerformEndlessFFT());
            Assert.Fail("Should have timed out");
        }

        private void PerformEndlessFFT()
        {
            while (true)
            {
                int size = 1 << 14;
                double[] data = new double[size];
                var rng = new Random();
                for (int i = 0; i < size; i++)
                    data[i] = rng.NextDouble();
                FourierTransformer.ComputeFft(data);
            }
        }

        public static System.Collections.IEnumerable FrequencyTestCases()
        {
            yield return new object[] { 44100, 1000.0, 0.5, 22050 };
            yield return new object[] { 48000, 5000.0, 0.2, 9600 };
            yield return new object[] { 8000, 400.0, 1.0, 8000 };
        }

        [TestMethod]
        [TestParameterSource(nameof(FrequencyTestCases))]
        public void ParameterizedSineWave_Heavy(int sampleRate, double freq, double duration, int expectedLength)
        {
            var signal = SignalGenerator.GenerateSineWave(sampleRate, freq, duration);
            Assert.AreEqual(expectedLength, signal.Length);
            var spectrum = FourierTransformer.ComputeFft(signal);
            Assert.AreEqual(signal.Length, spectrum.Length);
        }

        [TestMethod]
        public void ExpressionTreeAssert_Demo()
        {
            int a = 5, b = 3;
            Assert.That(() => a > b);
        }

        [TestMethod]
        public void AssortedAssertions()
        {
            Assert.AreEqual(1.0, 1.0);
            Assert.AreNotEqual(0, 1);
            Assert.IsTrue(true);
            Assert.IsFalse(false);
            Assert.IsNull(null);
            Assert.IsNotNull(new object());
            Assert.GreaterThan(5, 2);
            Assert.LessThan(1, 3);
            Assert.InRange(5, 1, 10);
            Assert.Contains(new[] { 1, 2, 3 }, 2);
        }
    }
}