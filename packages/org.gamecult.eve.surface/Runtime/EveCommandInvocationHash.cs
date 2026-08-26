using System;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

#nullable enable

namespace GameCult.Eve.Surface
{
    /// <summary>Canonical digest for one immutable Eve command invocation.</summary>
    public static class EveCommandInvocationHash
    {
        public static string Compute(EveSurfaceCommandRequest request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            var canonical = new StringBuilder();
            Append(request.Schema);
            Append(request.ProviderId);
            Append(request.SurfaceId);
            Append(request.OperationRecord.OperationId);
            Append(request.OperationRecord.SchemaId);
            Append(request.OperationRecord.RouteKind);
            Append(request.OperationRecord.RouteDescription);
            Append(request.OperationRecord.IdempotencyKey);
            foreach (var field in request.PayloadFields.OrderBy(pair => pair.Key, StringComparer.Ordinal))
            {
                Append(field.Key);
                Append(field.Value);
            }
            Append(request.IssuedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture));
            Append(request.ClientId);
            Append(request.CommandBoundary);
            Append(request.ReceiptSchema);
            Append(request.Delegation?.OriginalInvocationHash);
            Append(request.Delegation?.OriginalClientId);
            Append(request.Delegation?.DelegatingRuntimeId);
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(canonical.ToString()));
            var digest = new StringBuilder(bytes.Length * 2);
            foreach (var value in bytes) digest.Append(value.ToString("x2", CultureInfo.InvariantCulture));
            return digest.ToString();

            void Append(string? value)
            {
                value ??= "";
                canonical.Append(value.Length.ToString(CultureInfo.InvariantCulture));
                canonical.Append(':');
                canonical.Append(value);
            }
        }
    }
}
