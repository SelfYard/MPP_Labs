using TestFramework.Events;

namespace TestFramework.Threading
{
    public class CustomThreadPool : IDisposable
    {
        private struct WorkItem
        {
            public Action Action;
            public DateTime Enqueued;
        }

        private readonly int _minThreads;
        private readonly int _maxThreads;
        private readonly int _idleTimeoutMs;

        private readonly Queue<WorkItem> _workQueue = new();
        private readonly List<Thread> _threads = new();
        private readonly object _lock = new();

        private int _activeThreads;
        private volatile bool _disposed;

        public event EventHandler<PoolEventArgs>? ThreadCreated;
        public event EventHandler<PoolEventArgs>? ThreadDestroyed;
        public event EventHandler<PoolEventArgs>? WorkItemQueued;
        public event EventHandler<PoolEventArgs>? WorkItemStarted;

        public int QueueCount
        {
            get
            {
                lock (_lock) return _workQueue.Count;
            }
        }

        public int ActiveThreadCount => _activeThreads;

        public CustomThreadPool(int minThreads, int maxThreads, int idleTimeoutMs = 5000)
        {
            _minThreads = minThreads;
            _maxThreads = maxThreads;
            _idleTimeoutMs = idleTimeoutMs;

            for (int i = 0; i < minThreads; i++)
            {
                var thread = CreateThread(i);
                _threads.Add(thread);
                thread.Start();
                OnThreadCreated(thread.Name!);
            }
        }

        public void QueueUserWorkItem(Action workItem)
        {
            if (_disposed)
                throw new ObjectDisposedException(nameof(CustomThreadPool));

            lock (_lock)
            {
                _workQueue.Enqueue(new WorkItem { Action = workItem, Enqueued = DateTime.UtcNow });
                Monitor.Pulse(_lock);
            }

            WorkItemQueued?.Invoke(this, new PoolEventArgs { Message = "Work item queued" });

            EnsurePoolCapacity();
        }

        private void EnsurePoolCapacity()
        {
            Thread? newThread = null;
            lock (_lock)
            {
                if (_threads.Count < _maxThreads && _workQueue.Count > 0)
                {
                    bool needThread = false;

                    // Все потоки заняты
                    if (_activeThreads >= _threads.Count)
                        needThread = true;
                    else
                    {
                        var oldest = _workQueue.Peek();
                        if ((DateTime.UtcNow - oldest.Enqueued).TotalMilliseconds > _idleTimeoutMs / 2.0)
                            needThread = true;
                    }

                    if (needThread)
                    {
                        newThread = CreateThread(_threads.Count);
                        _threads.Add(newThread);
                    }
                }
            }

            if (newThread != null)
            {
                newThread.Start();
                OnThreadCreated(newThread.Name!);
            }
        }

        private Thread CreateThread(int index)
        {
            return new Thread(WorkerLoop)
            {
                IsBackground = true,
                Name = $"CustomPool-{index + 1}"
            };
        }

        private void WorkerLoop()
        {
            while (!_disposed)
            {
                Action? workItemAction = null;

                lock (_lock)
                {
                    while (_workQueue.Count == 0 && !_disposed)
                    {
                        bool signalled = Monitor.Wait(_lock, _idleTimeoutMs);

                        if (!signalled && _workQueue.Count == 0 && _threads.Count > _minThreads)
                        {
                            var current = Thread.CurrentThread;
                            string? threadName = current.Name;
                            _threads.Remove(current);

                            ThreadDestroyed?.Invoke(this, new PoolEventArgs
                            {
                                Message = $"Thread {threadName} destroyed (idle)"
                            });
                            return;
                        }

                        if (_disposed)
                            return;
                    }

                    if (_disposed && _workQueue.Count == 0)
                        return;

                    var workItem = _workQueue.Dequeue();
                    workItemAction = workItem.Action;
                }

                if (workItemAction != null)
                {
                    Interlocked.Increment(ref _activeThreads);
                    WorkItemStarted?.Invoke(this, new PoolEventArgs { Message = "Work item started" });

                    try
                    {
                        workItemAction();
                    }
                    catch (Exception ex)
                    {
                        TestEventBus.RaiseError(ex, "ThreadPool work item");
                    }
                    finally
                    {
                        Interlocked.Decrement(ref _activeThreads);
                    }
                }
            }
        }

        public void Dispose()
        {
            _disposed = true;

            lock (_lock)
            {
                Monitor.PulseAll(_lock);
            }

            Thread[] threadsCopy;
            lock (_lock)
            {
                threadsCopy = _threads.ToArray();
            }

            foreach (var t in threadsCopy)
            {
                t.Join();
            }
        }

        private void OnThreadCreated(string threadName)
        {
            ThreadCreated?.Invoke(this, new PoolEventArgs
            {
                Message = $"Thread {threadName} created"
            });
        }
    }
}