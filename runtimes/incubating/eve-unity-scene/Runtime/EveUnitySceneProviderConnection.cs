using System;
using GameCult.Eve.Surface;

#nullable enable

namespace GameCult.Eve.UnityScene
{
    public interface IEveUnitySceneProviderSurfaceSource
    {
        string ProviderId { get; }

        string SurfaceId { get; }

        string SourcePointer { get; }

        EveUnitySceneProviderSurfaceSnapshot CurrentSnapshot { get; }

        event Action<EveUnitySceneProviderSurfaceSnapshot> SnapshotAvailable;
    }

    public interface IEveUnitySceneCommandSink
    {
        string SinkKind { get; }

        void Submit(EveSurfaceCommandRequest request);
    }

    public sealed class EveUnitySceneProviderConnection : IDisposable
    {
        private readonly IEveUnitySceneProviderSurfaceSource _surfaceSource;
        private readonly IEveUnitySceneCommandSink _commandSink;
        private readonly EveUnitySceneClientSession _session;
        private bool _connected;

        public EveUnitySceneProviderConnection(
            IEveUnitySceneProviderSurfaceSource surfaceSource,
            IEveUnitySceneCommandSink commandSink)
            : this(surfaceSource, commandSink, new EveUnitySceneClientSession())
        {
        }

        public EveUnitySceneProviderConnection(
            IEveUnitySceneProviderSurfaceSource surfaceSource,
            IEveUnitySceneCommandSink commandSink,
            EveUnitySceneClientSession session)
        {
            _surfaceSource = surfaceSource ?? throw new ArgumentNullException(nameof(surfaceSource));
            _commandSink = commandSink ?? throw new ArgumentNullException(nameof(commandSink));
            _session = session ?? throw new ArgumentNullException(nameof(session));
        }

        public string ProviderId => _surfaceSource.ProviderId;

        public string SurfaceId => _surfaceSource.SurfaceId;

        public string SourcePointer => _surfaceSource.SourcePointer;

        public EveUnitySceneProjection? ActiveProjection => _session.ActiveProjection;

        public long ActiveVersion => _session.ActiveVersion;

        public event Action<EveUnitySceneProjection>? ProjectionUpdated;

        public EveUnitySceneProjection Connect()
        {
            if (!_connected)
            {
                _surfaceSource.SnapshotAvailable += OnSnapshotAvailable;
                _connected = true;
            }

            return ApplySnapshot(_surfaceSource.CurrentSnapshot);
        }

        public EveUnitySceneProjection Refresh()
        {
            return ApplySnapshot(_surfaceSource.CurrentSnapshot);
        }

        public EveSurfaceCommandRequest SubmitMoveIntent(
            string entityId,
            float targetX,
            float targetY,
            float targetZ,
            DateTimeOffset? issuedAt = null)
        {
            return Submit(_session.CreateMoveIntent(entityId, targetX, targetY, targetZ, issuedAt));
        }

        public EveSurfaceCommandRequest SubmitFocusIntent(
            string entityId,
            DateTimeOffset? issuedAt = null)
        {
            return Submit(_session.CreateFocusIntent(entityId, issuedAt));
        }

        public EveSurfaceCommandRequest SubmitTargetIntent(
            string sourceEntityId,
            string targetEntityId,
            DateTimeOffset? issuedAt = null)
        {
            return Submit(_session.CreateTargetIntent(sourceEntityId, targetEntityId, issuedAt));
        }

        public EveSurfaceCommandRequest SubmitActionIntent(
            string entityId,
            string actionId,
            DateTimeOffset? issuedAt = null)
        {
            return Submit(_session.CreateActionIntent(entityId, actionId, issuedAt));
        }

        public void Disconnect()
        {
            if (!_connected)
                return;

            _surfaceSource.SnapshotAvailable -= OnSnapshotAvailable;
            _connected = false;
        }

        public void Dispose()
        {
            Disconnect();
        }

        private EveSurfaceCommandRequest Submit(EveSurfaceCommandRequest request)
        {
            _commandSink.Submit(request);
            return request;
        }

        private EveUnitySceneProjection ApplySnapshot(EveUnitySceneProviderSurfaceSnapshot snapshot)
        {
            var projection = _session.ApplySnapshot(snapshot);
            ProjectionUpdated?.Invoke(projection);
            return projection;
        }

        private void OnSnapshotAvailable(EveUnitySceneProviderSurfaceSnapshot snapshot)
        {
            ApplySnapshot(snapshot);
        }
    }
}
