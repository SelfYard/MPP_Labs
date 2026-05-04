using System;

namespace SignalAnalysis.Core
{
    public class SignalAnalysisException : Exception
    {
        public SignalAnalysisException() { }
        public SignalAnalysisException(string message) : base(message) { }
        public SignalAnalysisException(string message, Exception inner) : base(message, inner) { }
    }

    public class InvalidSignalParametersException : SignalAnalysisException
    {
        public string? ParameterName { get; }
        public InvalidSignalParametersException(string parameterName, string message)
            : base(message) => ParameterName = parameterName;

        public InvalidSignalParametersException(string message) : base(message) { }
    }

    public class FftSizeException : SignalAnalysisException
    {
        public FftSizeException(string message) : base(message) { }
    }

    public class FilterConfigurationException : SignalAnalysisException
    {
        public FilterConfigurationException(string message) : base(message) { }
    }

    public class SignalBufferDisposedException : InvalidOperationException
    {
        public SignalBufferDisposedException()
            : base("Signal buffer has been disposed and is no longer accessible.") { }
    }
}