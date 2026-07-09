using System;
using GameCult.Eve.Surface;

#nullable enable

namespace GameCult.Eve.UnityScene
{
    public sealed class EveUnityPlayableWorldLiveClient : IDisposable
    {
        private readonly EveUnitySceneProviderConnection _connection;
        private readonly EveUnityPlayableWorldPresenter _presenter;
        private bool _connected;

        public EveUnityPlayableWorldLiveClient(
            EveUnitySceneProviderConnection connection,
            EveUnityPlayableWorldPresenter presenter)
        {
            _connection = connection ?? throw new ArgumentNullException(nameof(connection));
            _presenter = presenter ?? throw new ArgumentNullException(nameof(presenter));
        }

        public EveUnitySceneProjection? ActiveProjection => _connection.ActiveProjection;

        public EveUnityPlayableWorldProjection? ActiveWorld => ActiveProjection?.PlayableWorld;

        public EveUnityPlayableWorldPresentation? LastPresentation { get; private set; }

        public long ActiveVersion => _connection.ActiveVersion;

        public string SourcePointer => _connection.SourcePointer;

        public EveUnityPlayableWorldPresentation Connect()
        {
            EnsureSubscribed();
            _connection.Connect();
            return RequirePresentation();
        }

        public EveUnityPlayableWorldPresentation Refresh()
        {
            EnsureSubscribed();
            _connection.Refresh();
            return RequirePresentation();
        }

        public EveSurfaceCommandRequest SubmitMoveIntent(
            string entityId,
            float targetX,
            float targetY,
            float targetZ,
            DateTimeOffset? issuedAt = null)
        {
            return _connection.SubmitMoveIntent(entityId, targetX, targetY, targetZ, issuedAt);
        }

        public EveSurfaceCommandRequest SubmitFocusIntent(
            string entityId,
            DateTimeOffset? issuedAt = null)
        {
            return _connection.SubmitFocusIntent(entityId, issuedAt);
        }

        public EveSurfaceCommandRequest SubmitTargetIntent(
            string sourceEntityId,
            string targetEntityId,
            DateTimeOffset? issuedAt = null)
        {
            return _connection.SubmitTargetIntent(sourceEntityId, targetEntityId, issuedAt);
        }

        public EveSurfaceCommandRequest SubmitActionIntent(
            string entityId,
            string actionId,
            DateTimeOffset? issuedAt = null)
        {
            return _connection.SubmitActionIntent(entityId, actionId, issuedAt);
        }

        public void Disconnect()
        {
            if (_connected)
            {
                _connection.ProjectionUpdated -= OnProjectionUpdated;
                _connected = false;
            }

            _connection.Disconnect();
        }

        public void Dispose()
        {
            Disconnect();
            _connection.Dispose();
        }

        private void EnsureSubscribed()
        {
            if (_connected)
                return;

            _connection.ProjectionUpdated += OnProjectionUpdated;
            _connected = true;
        }

        private void OnProjectionUpdated(EveUnitySceneProjection projection)
        {
            LastPresentation = _presenter.Apply(projection);
        }

        private EveUnityPlayableWorldPresentation RequirePresentation()
        {
            if (LastPresentation == null)
                throw new InvalidOperationException("The active Unity scene surface has not produced a playable world presentation.");
            return LastPresentation;
        }
    }
}
